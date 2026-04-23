import { prisma } from '../database/prisma';
import { Prisma } from '@prisma/client';

export class CircuitRepository {
  async list() {
    return prisma.circuit.findMany({
      include: { category: true, _count: { select: { stages: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.circuit.findUnique({
      where: { id },
      include: {
        category: true,
        stages: {
          orderBy: { stageNumber: 'asc' },
          include: { tournaments: true },
        },
      },
    });
  }

  async create(data: Prisma.CircuitCreateInput) {
    return prisma.circuit.create({ data });
  }

  async update(id: string, data: Prisma.CircuitUpdateInput) {
    return prisma.circuit.update({ where: { id }, data });
  }

  // ---- Stages ----

  async createStage(data: Prisma.StageCreateInput) {
    return prisma.stage.create({ data });
  }

  async findStage(id: string) {
    return prisma.stage.findUnique({
      where: { id },
      include: { circuit: true, tournaments: true, results: true },
    });
  }

  async markStageFinished(id: string) {
    return prisma.stage.update({
      where: { id },
      data: { finishedAt: new Date() },
    });
  }

  // ---- Stage results ----

  async replaceStageResults(
    stageId: string,
    rows: Array<{ playerId: string; position: number; pointsEarned: number }>,
  ) {
    await prisma.$transaction([
      prisma.stageResult.deleteMany({ where: { stageId } }),
      prisma.stageResult.createMany({
        data: rows.map((r) => ({ ...r, stageId })),
      }),
    ]);
  }

  async listStageResultsByCircuit(circuitId: string) {
    return prisma.stageResult.findMany({
      where: { stage: { circuitId } },
      include: { stage: true },
    });
  }

  // ---- Circuit ranking (denormalized) ----

  async upsertCircuitRanking(
    circuitId: string,
    rows: Array<{
      playerId: string;
      totalPoints: number;
      stagesPlayed: number;
      bestPosition: number;
    }>,
  ) {
    await prisma.$transaction([
      prisma.circuitRanking.deleteMany({ where: { circuitId } }),
      prisma.circuitRanking.createMany({
        data: rows.map((r) => ({ ...r, circuitId })),
      }),
    ]);
  }

  async getCircuitRanking(circuitId: string, limit?: number) {
    return prisma.circuitRanking.findMany({
      where: { circuitId },
      include: { player: true },
      orderBy: { totalPoints: 'desc' },
      take: limit,
    });
  }
}
