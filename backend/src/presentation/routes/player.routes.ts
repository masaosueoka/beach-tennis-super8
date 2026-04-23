import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const playerRouter = Router();

// Public — anyone can see the list of players
playerRouter.get('/', asyncHandler(PlayerController.list));
playerRouter.get('/:id', asyncHandler(PlayerController.getById));

// Organizer/Admin can create/edit
playerRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(PlayerController.create),
);
playerRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(PlayerController.update),
);
