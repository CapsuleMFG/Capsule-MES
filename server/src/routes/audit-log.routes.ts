import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import { getAuditLog } from '../controllers/audit-log.controller';

const router = Router();

router.get('/', requireRole('admin', 'manager'), getAuditLog);

export default router;
