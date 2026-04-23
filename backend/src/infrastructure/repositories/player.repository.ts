import { prisma } from '../database/prisma';
import { Prisma, Player } from '@prisma/client';

export class PlayerRepository {
  async findById(id: string) {
    return prisma.player.findUnique({
      where: { id },
      include: { categories: { include: { category: true } } },
    });
  }

  async findByEmail(email: string): Promise<Player | null> {
    return prisma.player.findUnique({ where: { email } });
  }

  async list(filters: { categoryId?: string; active?: boolean; search?: string } = {}) {
    return prisma.player.findMany({
      where: {
        active: filters.active,
        name: filters.search ? { contains: filters.search, mode: 'insensitive' } : undefined,
        categories: filters.categoryId
          ? { some: { categoryId: filters.categoryId } }
          : undefined,
      },
      include: { categories: { include: { category: true } } },
      orderBy: { rankingPoints: 'desc' },
    });
  }

  async topByRanking(limit = 5) {
    return prisma.player.findMany({
      where: { active: true },
      orderBy: { rankingPoints: 'desc' },
      take: limit,
    });
  }

  async topByCircuit(limit = 5) {
    return prisma.player.findMany({
      where: { active: true },
      orderBy: { circuitPoints: 'desc' },
      take: limit,
    });
  }

  async create(data: Prisma.PlayerCreateInput): Promise<Player> {
    return prisma.player.create({ data });
  }

  async update(id: string, data: Prisma.PlayerUpdateInput): Promise<Player> {
    return prisma.player.update({ where: { id }, data });
  }

  async setCategories(playerId: string, categoryIds: string[]): Promise<void> {
    await prisma.$transaction([
      prisma.playerCategory.deleteMany({ where: { playerId } }),
      prisma.playerCategory.createMany({
        data: categoryIds.map((categoryId) => ({ playerId, categoryId })),
        skipDuplicates: true,
      }),
    ]);
  }

  async incrementRankingPoints(playerId: string, delta: number): Promise<void> {
    await prisma.player.update({
      where: { id: playerId },
      data: { rankingPoints: { increment: delta } },
    });
  }
}
