import { Request, Response } from 'express';
import { SponsorRepository } from '../../infrastructure/repositories/misc.repositories';
import { createSponsorSchema } from '../../application/dto/schemas';
import { NotFoundError } from '../../domain/errors';

const sponsorRepo = new SponsorRepository();

export const SponsorController = {
  async listActive(_req: Request, res: Response): Promise<void> {
    const sponsors = await sponsorRepo.listActive();
    res.json(sponsors);
  },

  async listAll(_req: Request, res: Response): Promise<void> {
    const sponsors = await sponsorRepo.listAll();
    res.json(sponsors);
  },

  async create(req: Request, res: Response): Promise<void> {
    const dto = createSponsorSchema.parse(req.body);
    const sponsor = await sponsorRepo.create(dto);
    res.status(201).json(sponsor);
  },

  async update(req: Request, res: Response): Promise<void> {
    const dto = createSponsorSchema.partial().parse(req.body);
    const updated = await sponsorRepo.update(req.params.id, dto);
    res.json(updated);
  },

  async delete(req: Request, res: Response): Promise<void> {
    await sponsorRepo.delete(req.params.id).catch(() => {
      throw new NotFoundError('Sponsor', req.params.id);
    });
    res.status(204).send();
  },
};
