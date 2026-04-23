import { prisma } from '../database/prisma';
import { Prisma, Tournament, Match, TournamentStanding } from '@prisma/client';
import { MatchSummary } from '../../domain/entities/types';

export class TournamentRepository {
  async findById(id: string): Promise<Tournament | null> {
    return prisma.tournament.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: string) {
    return prisma.tournament.findUnique({
      where: { id },
      include: {
        category: true,
        entries: { include: { player: true }, orderBy: { seedNumber: 'asc' } },
        matches: { orderBy: [{ roundNumber: 'asc' }, { createdAt: 'asc' }] },
        standings: {
          include: { player: true },
          orderBy: [{ points: 'desc' }, { player: { name: 'asc' } }],
        },
      },
    });
  }

  async list(filters: { status?: string; categoryId?: string } = {}) {
    return prisma.tournament.findMany({
      where: {
        status: filters.status as any,
        categoryId: filters.categoryId,
      },
      include: { category: true, _count: { select: { entries: true, matches: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.TournamentCreateInput): Promise<Tournament> {
    return prisma.tournament.create({ data });
  }

  async update(id: string, data: Prisma.TournamentUpdateInput): Promise<Tournament> {
    return prisma.tournament.update({ where: { id }, data });
  }

  // ---- Entries ----

  async setEntries(
    tournamentId: string,
    entries: Array<{ playerId: string; seedNumber: number }>,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.tournamentPlayer.deleteMany({ where: { tournamentId } }),
      prisma.tournamentPlayer.createMany({
        data: entries.map((e) => ({ ...e, tournamentId })),
      }),
    ]);
  }

  async listEntries(tournamentId: string) {
    return prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: { player: true },
      orderBy: { seedNumber: 'asc' },
    });
  }

  // ---- Matches ----

  async createMatches(
    tournamentId: string,
    matches: Array<{ playerAId: string; playerBId: string; roundNumber: number }>,
  ): Promise<void> {
    await prisma.match.createMany({
      data: matches.map((m) => ({
        ...m,
        tournamentId,
        status: 'SCHEDULED',
      })),
    });
  }

  async findMatch(id: string): Promise<Match | null> {
    return prisma.match.findUnique({ where: { id } });
  }

  async listMatches(tournamentId: string): Promise<Match[]> {
    return prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ roundNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateMatch(id: string, data: Prisma.MatchUpdateInput): Promise<Match> {
    return prisma.match.update({ where: { id }, data });
  }

  // ---- Standings (denormalized) ----

  async upsertStandings(
    tournamentId: string,
    standings: Array<{
      playerId: string;
      matchesPlayed: number;
      wins: number;
      losses: number;
      setsWon: number;
      setsLost: number;
      gamesWon: number;
      gamesLost: number;
      setDifference: number;
      gameDifference: number;
      points: number;
      position: number | null;
    }>,
  ): Promise<void> {
    // Replace in a single transaction for consistency
    await prisma.$transaction([
      prisma.tournamentStanding.deleteMany({ where: { tournamentId } }),
      prisma.tournamentStanding.createMany({
        data: standings.map((s) => ({ ...s, tournamentId })),
      }),
    ]);
  }

  async listStandings(tournamentId: string): Promise<TournamentStanding[]> {
    return prisma.tournamentStanding.findMany({
      where: { tournamentId },
      orderBy: { position: 'asc' },
    });
  }

  // ---- Utility for the ranking engine ----

  toMatchSummary(m: Match): MatchSummary {
    return {
      id: m.id,
      playerAId: m.playerAId,
      playerBId: m.playerBId,
      winnerId: m.winnerId,
      setsWonA: m.setsWonA,
      setsWonB: m.setsWonB,
      gamesWonA: m.gamesWonA,
      gamesWonB: m.gamesWonB,
      roundNumber: m.roundNumber,
      finished: m.status === 'FINISHED',
    };
  }
}
