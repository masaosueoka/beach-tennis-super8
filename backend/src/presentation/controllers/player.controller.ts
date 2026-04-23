import { Request, Response } from 'express';
import { PlayerRepository } from '../../infrastructure/repositories/player.repository';
import { createPlayerSchema, updatePlayerSchema } from '../../application/dto/schemas';
import { NotFoundError } from '../../domain/errors';

const playerRepo = new PlayerRepository();

export const PlayerController = {
  async list(req: Request, res: Response): Promise<void> {
    const { categoryId, active, search } = req.query;
    const players = await playerRepo.list({
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      search: typeof search === 'string' ? search : undefined,
    });
    res.json(players);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const player = await playerRepo.findById(req.params.id);
    if (!player) throw new NotFoundError('Player', req.params.id);
    res.json(player);
  },

  async create(req: Request, res: Response): Promise<void> {
    const dto = createPlayerSchema.parse(req.body);
    const { categoryIds, ...data } = dto;
    const player = await playerRepo.create(data as never);
    if (categoryIds && categoryIds.length > 0) {
      await playerRepo.setCategories(player.id, categoryIds);
    }
    const withRelations = await playerRepo.findById(player.id);
    res.status(201).json(withRelations);
  },

  async update(req: Request, res: Response): Promise<void> {
    const dto = updatePlayerSchema.parse(req.body);
    const { categoryIds, ...data } = dto;
    const existing = await playerRepo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Player', req.params.id);
    await playerRepo.update(req.params.id, data as never);
    if (categoryIds) {
      await playerRepo.setCategories(req.params.id, categoryIds);
    }
    const updated = await playerRepo.findById(req.params.id);
    res.json(updated);
  },
};
