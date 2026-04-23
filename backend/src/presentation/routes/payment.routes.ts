import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const paymentRouter = Router();

paymentRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER', 'PLAYER'),
  asyncHandler(PaymentController.create),
);
paymentRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(PaymentController.updateStatus),
);
paymentRouter.get(
  '/tournament/:tournamentId',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(PaymentController.listByTournament),
);
