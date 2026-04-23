import { Router } from 'express';
import { SponsorController } from '../controllers/sponsor.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const sponsorRouter = Router();

sponsorRouter.get('/', asyncHandler(SponsorController.listActive));
sponsorRouter.get(
  '/all',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(SponsorController.listAll),
);
sponsorRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(SponsorController.create),
);
sponsorRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(SponsorController.update),
);
sponsorRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(SponsorController.delete),
);
