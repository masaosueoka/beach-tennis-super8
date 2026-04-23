import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const storageRouter = Router();

storageRouter.post(
  '/presign',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(StorageController.getPresignedUploadUrl),
);
