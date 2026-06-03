import { Router } from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeEquipment,
  getEmployeeHistory,
} from '../controllers/employees.controller';
import { authenticate, canManageAssets } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(getAllEmployees));
router.get('/:id/equipment', authenticate, asyncHandler(getEmployeeEquipment));
router.get('/:id/history', authenticate, asyncHandler(getEmployeeHistory));
router.get('/:id', authenticate, asyncHandler(getEmployeeById));
router.post('/', authenticate, canManageAssets, asyncHandler(createEmployee));
router.put('/:id', authenticate, canManageAssets, asyncHandler(updateEmployee));
router.delete('/:id', authenticate, canManageAssets, asyncHandler(deleteEmployee));

export default router;
