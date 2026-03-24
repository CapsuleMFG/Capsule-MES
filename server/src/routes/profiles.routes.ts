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

// Admin/Manager user management
router.get('/', requireRole('admin', 'manager'), getProfiles);
router.get('/:id', requireRole('admin', 'manager'), getProfile);
router.post('/', requireRole('admin', 'manager'), createProfile);
router.put('/:id', requireRole('admin', 'manager'), updateProfile);

export default router;
