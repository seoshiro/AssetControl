import { Router } from 'express';
import {
  getAllIssuances,
  createIssuance,
  returnIssuance,
  getOverdueIssuances,
} from '../controllers/issuances.controller';
import { authenticate, canManageAssets } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(getAllIssuances));
router.get('/overdue', authenticate, asyncHandler(getOverdueIssuances));
router.post('/', authenticate, canManageAssets, asyncHandler(createIssuance));
router.put('/:id/return', authenticate, canManageAssets, asyncHandler(returnIssuance));

export default router;
