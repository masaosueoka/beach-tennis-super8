import { Request, Response } from 'express';
import { CategoryRepository } from '../../infrastructure/repositories/misc.repositories';
import { createCategorySchema } from '../../application/dto/schemas';
import { NotFoundError } from '../../domain/errors';

const categoryRepo = new CategoryRepository();

export const CategoryController = {
  async list(_req: Request, res: Response): Promise<void> {
    const categories = await categoryRepo.list();
    res.json(categories);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const category = await categoryRepo.findById(req.params.id);
    if (!category) throw new NotFoundError('Category', req.params.id);
    res.json(category);
  },

  async create(req: Request, res: Response): Promise<void> {
    const dto = createCategorySchema.parse(req.body);
    const category = await categoryRepo.create(dto);
    res.status(201).json(category);
  },

  async update(req: Request, res: Response): Promise<void> {
    const dto = createCategorySchema.partial().parse(req.body);
    const existing = await categoryRepo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Category', req.params.id);
    const updated = await categoryRepo.update(req.params.id, dto);
    res.json(updated);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const existing = await categoryRepo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Category', req.params.id);
    await categoryRepo.delete(req.params.id);
    res.status(204).send();
  },
};
