import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { query, queryOne } from '../models/database';
import { logAudit } from '../middleware/audit';
import { validatePassword } from '../lib/validation';
import { logger } from '../lib/logger';

/**
 * POST /api/auth/login
 * Server-proxied login with rate limiting and account lockout.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    // Check account lockout (join profiles via auth.users email)
    const profile = await queryOne<{ id: string; name: string; locked_until: string | null }>(
      `SELECT p.id, p.name, p.locked_until
       FROM profiles p
       JOIN auth.users u ON u.id = p.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
      await logAudit({
        user: undefined,
        action: 'LOGIN_FAILURE',
        tableName: 'auth',
        recordId: null,
        newValues: { email, reason: 'account_locked', ip },
      });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Attempt sign-in via Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      // Log failed attempt
      await query(
        'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, false)',
        [email.toLowerCase(), ip]
      );

      // Check if we need to lock the account
      const recentFailures = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE email = $1 AND success = false AND attempted_at > NOW() - INTERVAL '15 minutes'`,
        [email.toLowerCase()]
      );

      if (recentFailures && parseInt(recentFailures.count) >= 10) {
        // Lock the account for 15 minutes
        if (profile) {
          await query(
            `UPDATE profiles SET locked_until = NOW() + INTERVAL '15 minutes' WHERE id = $1`,
            [profile.id]
          );
          await logAudit({
            user: undefined,
            action: 'ACCOUNT_LOCKED',
            tableName: 'profiles',
            recordId: profile.id,
            newValues: { email, reason: '10_failed_attempts', ip },
          });
        }
      }

      await logAudit({
        user: undefined,
        action: 'LOGIN_FAILURE',
        tableName: 'auth',
        recordId: null,
        newValues: { email, ip },
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Success — log attempt and clear any lockout
    await query(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, true)',
      [email.toLowerCase(), ip]
    );

    if (profile?.locked_until) {
      await query('UPDATE profiles SET locked_until = NULL WHERE id = $1', [profile.id]);
    }

    await logAudit({
      user: { id: data.user.id, email: data.user.email || '', name: profile?.name || '', role: 'operator' as const },
      action: 'LOGIN_SUCCESS',
      tableName: 'auth',
      recordId: data.user.id,
      newValues: { ip },
    });

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * POST /api/auth/logout
 * Server-side logout with audit logging. On publicPaths — works even with expired tokens.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    let userName = 'unknown';

    // Try to resolve user from token (best-effort — token may be expired)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          userId = user.id;
          const profile = await queryOne<{ name: string }>('SELECT name FROM profiles WHERE id = $1', [user.id]);
          userName = profile?.name || 'unknown';
          // Sign out the user on Supabase side
          await supabaseAdmin.auth.admin.signOut(user.id);
        }
      } catch {
        // Token expired or invalid — that's fine for logout
      }
    }

    await logAudit({
      user: userId ? { id: userId, email: '', name: userName, role: 'operator' as const } : undefined,
      action: 'LOGOUT',
      tableName: 'auth',
      recordId: userId || null,
      newValues: {},
    });

    res.json({ message: 'Logged out' });
  } catch (error) {
    logger.error('Logout error', { error: error instanceof Error ? error.message : error });
    // Logout should always succeed from the client's perspective
    res.json({ message: 'Logged out' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Sends password reset email via Supabase. Always returns 200 (no email enumeration).
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`,
    });

    await logAudit({
      user: undefined,
      action: 'PASSWORD_RESET_REQUEST',
      tableName: 'auth',
      recordId: null,
      newValues: { email },
    });
  } catch (error) {
    // Log but don't expose errors to prevent email enumeration
    logger.error('Forgot password error', { error: error instanceof Error ? error.message : error });
  }

  // Always return 200 regardless of whether email exists
  res.json({ message: 'If that email exists, you will receive a reset link' });
};

/**
 * POST /api/auth/reset-password
 * Validates password strength, then updates via Supabase admin API.
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { access_token, password } = req.body;

  if (!access_token || !password) {
    res.status(400).json({ error: 'Access token and new password are required' });
    return;
  }

  // Validate password strength
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  try {
    // Exchange access_token for user ID
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(access_token);

    if (getUserError || !user) {
      res.status(401).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Update password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
    });

    if (updateError) {
      logger.error('Password update failed', { error: updateError.message, userId: user.id });
      res.status(500).json({ error: 'Failed to update password' });
      return;
    }

    await logAudit({
      user: { id: user.id, email: user.email || '', name: '', role: 'operator' as const },
      action: 'PASSWORD_RESET_COMPLETE',
      tableName: 'auth',
      recordId: user.id,
      newValues: {},
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Reset password error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
