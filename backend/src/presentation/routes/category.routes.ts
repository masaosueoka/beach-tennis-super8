import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const categoryRouter = Router();

categoryRouter.get('/', asyncHandler(CategoryController.list));
categoryRouter.get('/:id', asyncHandler(CategoryController.getById));
categoryRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(CategoryController.create),
);
categoryRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(CategoryController.update),
);
categoryRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(CategoryController.delete),
);
