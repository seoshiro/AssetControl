import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { downloadBackup, restoreBackup } from '../controllers/backup.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const upload = multer({ dest: os.tmpdir() });

router.get('/download', authenticate, requireAdmin, downloadBackup);
router.post('/restore', authenticate, requireAdmin, upload.single('file'), restoreBackup);

export default router;
