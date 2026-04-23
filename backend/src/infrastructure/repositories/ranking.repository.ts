import { prisma } from '../database/prisma';

export class RankingRepository {
  async upsert(
    playerId: string,
    categoryId: string,
    delta: { points?: number; tournamentsPlayed?: number; wins?: number; losses?: number },
  ) {
    return prisma.ranking.upsert({
      where: { playerId_categoryId: { playerId, categoryId } },
      create: {
        playerId,
        categoryId,
        points: delta.points ?? 0,
        tournamentsPlayed: delta.tournamentsPlayed ?? 0,
        wins: delta.wins ?? 0,
        losses: delta.losses ?? 0,
      },
      update: {
        points: { increment: delta.points ?? 0 },
        tournamentsPlayed: { increment: delta.tournamentsPlayed ?? 0 },
        wins: { increment: delta.wins ?? 0 },
        losses: { increment: delta.losses ?? 0 },
      },
    });
  }

  async byCategory(categoryId: string, limit?: number) {
    return prisma.ranking.findMany({
      where: { categoryId },
      include: { player: true },
      orderBy: { points: 'desc' },
      take: limit,
    });
  }

  async globalTop(limit = 5) {
    return prisma.player.findMany({
      where: { active: true },
      orderBy: { rankingPoints: 'desc' },
      take: limit,
    });
  }
}
