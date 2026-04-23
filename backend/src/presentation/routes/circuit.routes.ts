import { Router } from 'express';
import { CircuitController } from '../controllers/circuit.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const circuitRouter = Router();

circuitRouter.get('/', asyncHandler(CircuitController.list));
circuitRouter.get('/:id', asyncHandler(CircuitController.getById));
circuitRouter.get('/:id/ranking', asyncHandler(CircuitController.getRanking));

circuitRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(CircuitController.create),
);
circuitRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(CircuitController.update),
);
circuitRouter.post(
  '/:id/stages',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(CircuitController.createStage),
);
