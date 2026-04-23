import { Router } from 'express';
import { RankingController } from '../controllers/ranking.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';

export const rankingRouter = Router();

rankingRouter.get('/top', asyncHandler(RankingController.globalTop));
rankingRouter.get('/circuit/top', asyncHandler(RankingController.topCircuit));
rankingRouter.get('/category/:categoryId', asyncHandler(RankingController.byCategory));
