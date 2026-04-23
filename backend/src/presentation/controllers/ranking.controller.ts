import { Request, Response } from 'express';
import { RankingRepository } from '../../infrastructure/repositories/ranking.repository';
import { PlayerRepository } from '../../infrastructure/repositories/player.repository';

const rankingRepo = new RankingRepository();
const playerRepo = new PlayerRepository();

export const RankingController = {
  async byCategory(req: Request, res: Response): Promise<void> {
    const rankings = await rankingRepo.byCategory(req.params.categoryId);
    res.json(rankings);
  },

  async globalTop(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(String(req.query.limit ?? '10'), 10) || 10, 50);
    const top = await playerRepo.topByRanking(limit);
    res.json(top);
  },

  async topCircuit(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(String(req.query.limit ?? '10'), 10) || 10, 50);
    const top = await playerRepo.topByCircuit(limit);
    res.json(top);
  },
};
