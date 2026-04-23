import { Router } from 'express';
import { ImageController } from '../controllers/image.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';

export const imageRouter = Router();

// All image endpoints are publicly accessible — they render already-public
// ranking data and are useful as direct URLs to share on WhatsApp.
imageRouter.get('/ranking/top5.png', asyncHandler(ImageController.rankingTop5));
imageRouter.get('/circuits/:id/top5.png', asyncHandler(ImageController.circuitTop5));
imageRouter.get('/categories/:id/top5.png', asyncHandler(ImageController.categoryTop5));
imageRouter.get(
  '/tournaments/:id/standings.png',
  asyncHandler(ImageController.tournamentStandings),
);
