import { Request, Response } from 'express';
import { CircuitRepository } from '../../infrastructure/repositories/circuit.repository';
import {
  createCircuitSchema,
  createStageSchema,
} from '../../application/dto/schemas';
import { NotFoundError } from '../../domain/errors';

const circuitRepo = new CircuitRepository();

export const CircuitController = {
  async list(_req: Request, res: Response): Promise<void> {
    const circuits = await circuitRepo.list();
    res.json(circuits);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const circuit = await circuitRepo.findById(req.params.id);
    if (!circuit) throw new NotFoundError('Circuit', req.params.id);
    res.json(circuit);
  },

  async create(req: Request, res: Response): Promise<void> {
    const dto = createCircuitSchema.parse(req.body);
    const circuit = await circuitRepo.create({
      name: dto.name,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      pointsTable: dto.pointsTable as never,
      category: { connect: { id: dto.categoryId } },
    });
    res.status(201).json(circuit);
  },

  async update(req: Request, res: Response): Promise<void> {
    const dto = createCircuitSchema.partial().parse(req.body);
    const existing = await circuitRepo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Circuit', req.params.id);
    const updated = await circuitRepo.update(req.params.id, {
      name: dto.name,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      pointsTable: dto.pointsTable as never,
      ...(dto.categoryId ? { category: { connect: { id: dto.categoryId } } } : {}),
    });
    res.json(updated);
  },

  async createStage(req: Request, res: Response): Promise<void> {
    const dto = createStageSchema.parse(req.body);
    const circuit = await circuitRepo.findById(req.params.id);
    if (!circuit) throw new NotFoundError('Circuit', req.params.id);
    const stage = await circuitRepo.createStage({
      name: dto.name,
      stageNumber: dto.stageNumber,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      circuit: { connect: { id: req.params.id } },
    });
    res.status(201).json(stage);
  },

  async getRanking(req: Request, res: Response): Promise<void> {
    const limit = req.query.limit
      ? Math.min(parseInt(String(req.query.limit), 10) || 20, 100)
      : undefined;
    const ranking = await circuitRepo.getCircuitRanking(req.params.id, limit);
    res.json(ranking);
  },
};
