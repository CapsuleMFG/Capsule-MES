import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  getMyProfile,
} from '../controllers/profiles.controller';

const router = Router();

// Current user's own profile — no role restriction
router.get('/me', getMyProfile);

// Admin-only user management
router.get('/', requireRole('admin'), getProfiles);
router.get('/:id', requireRole('admin'), getProfile);
router.post('/', requireRole('admin'), createProfile);
router.put('/:id', requireRole('admin'), updateProfile);

export default router;
