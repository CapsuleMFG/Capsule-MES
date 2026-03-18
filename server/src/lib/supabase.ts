import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Singleton admin client — use service role key for server-side operations
// Import this in middleware/auth.ts and controllers/profiles.controller.ts
// NEVER call createClient() again anywhere else on the server
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
