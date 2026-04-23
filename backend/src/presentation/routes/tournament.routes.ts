import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const tournamentRouter = Router();

// Public read
tournamentRouter.get('/', asyncHandler(TournamentController.list));
tournamentRouter.get('/:id', asyncHandler(TournamentController.getById));
tournamentRouter.get('/:id/standings', asyncHandler(TournamentController.listStandings));
tournamentRouter.get('/:id/matches', asyncHandler(TournamentController.listMatches));

// Write — Organizer/Admin
tournamentRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(TournamentController.create),
);
tournamentRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(TournamentController.update),
);
tournamentRouter.post(
  '/:id/players',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(TournamentController.registerPlayers),
);
tournamentRouter.post(
  '/:id/start',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER'),
  asyncHandler(TournamentController.start),
);

// Match result — Referee may submit
tournamentRouter.post(
  '/matches/:matchId/result',
  requireAuth,
  requireRole('ADMIN', 'ORGANIZER', 'REFEREE'),
  asyncHandler(TournamentController.submitResult),
);
