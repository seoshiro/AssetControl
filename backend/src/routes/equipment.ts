import { Router } from 'express';
import {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  exportEquipmentToExcel,
  writeOffEquipment,
  markLostEquipment,
} from '../controllers/equipment.controller';
import { authenticate, canManageAssets } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(getAllEquipment));
router.get('/export/excel', authenticate, asyncHandler(exportEquipmentToExcel));
router.get('/:id', authenticate, asyncHandler(getEquipmentById));
router.post('/', authenticate, canManageAssets, asyncHandler(createEquipment));
router.put('/:id', authenticate, canManageAssets, asyncHandler(updateEquipment));
router.delete('/:id', authenticate, canManageAssets, asyncHandler(deleteEquipment));
router.post('/:id/write-off', authenticate, canManageAssets, asyncHandler(writeOffEquipment));
router.post('/:id/mark-lost', authenticate, canManageAssets, asyncHandler(markLostEquipment));

export default router;
