import { Request, Response } from 'express';
import { TournamentRepository } from '../../infrastructure/repositories/tournament.repository';
import { PlayerRepository } from '../../infrastructure/repositories/player.repository';
import { RankingRepository } from '../../infrastructure/repositories/ranking.repository';
import { StartTournamentUseCase } from '../../application/use-cases/start-tournament.use-case';
import { SubmitMatchResultUseCase } from '../../application/use-cases/submit-match-result.use-case';
import {
  createTournamentSchema,
  registerPlayersSchema,
  submitMatchResultSchema,
} from '../../application/dto/schemas';
import { NotFoundError, ValidationError } from '../../domain/errors';

const tournamentRepo = new TournamentRepository();
const playerRepo = new PlayerRepository();
const rankingRepo = new RankingRepository();
const startUseCase = new StartTournamentUseCase(tournamentRepo);
const submitResultUseCase = new SubmitMatchResultUseCase(
  tournamentRepo,
  playerRepo,
  rankingRepo,
);

export const TournamentController = {
  async list(req: Request, res: Response): Promise<void> {
    const { status, categoryId } = req.query;
    const tournaments = await tournamentRepo.list({
      status: typeof status === 'string' ? status : undefined,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
    });
    res.json(tournaments);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const tournament = await tournamentRepo.findByIdWithRelations(req.params.id);
    if (!tournament) throw new NotFoundError('Tournament', req.params.id);
    res.json(tournament);
  },

  async create(req: Request, res: Response): Promise<void> {
    const dto = createTournamentSchema.parse(req.body);
    const tournament = await tournamentRepo.create({
      name: dto.name,
      matchMode: dto.matchMode,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      registrationFee: dto.registrationFee,
      category: { connect: { id: dto.categoryId } },
      ...(dto.stageId ? { stage: { connect: { id: dto.stageId } } } : {}),
    });
    res.status(201).json(tournament);
  },

  async update(req: Request, res: Response): Promise<void> {
    const dto = createTournamentSchema.partial().parse(req.body);
    const existing = await tournamentRepo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Tournament', req.params.id);
    const updated = await tournamentRepo.update(req.params.id, {
      name: dto.name,
      matchMode: dto.matchMode,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      registrationFee: dto.registrationFee,
      ...(dto.categoryId ? { category: { connect: { id: dto.categoryId } } } : {}),
      ...(dto.stageId ? { stage: { connect: { id: dto.stageId } } } : {}),
    });
    res.json(updated);
  },

  async registerPlayers(req: Request, res: Response): Promise<void> {
    const dto = registerPlayersSchema.parse(req.body);
    const tournament = await tournamentRepo.findById(req.params.id);
    if (!tournament) throw new NotFoundError('Tournament', req.params.id);
    if (tournament.status !== 'DRAFT' && tournament.status !== 'OPEN') {
      throw new ValidationError(
        `Cannot register players — tournament is ${tournament.status}`,
      );
    }
    if (dto.playerIds.length > tournament.maxPlayers) {
      throw new ValidationError(
        `Too many players — max is ${tournament.maxPlayers}`,
      );
    }
    const entries = dto.playerIds.map((playerId, i) => ({
      playerId,
      seedNumber: i + 1,
    }));
    await tournamentRepo.setEntries(req.params.id, entries);
    await tournamentRepo.update(req.params.id, { status: 'OPEN' });
    const updated = await tournamentRepo.findByIdWithRelations(req.params.id);
    res.json(updated);
  },

  async start(req: Request, res: Response): Promise<void> {
    const result = await startUseCase.execute(req.params.id);
    const tournament = await tournamentRepo.findByIdWithRelations(req.params.id);
    res.json({ ...result, tournament });
  },

  async submitResult(req: Request, res: Response): Promise<void> {
    const dto = submitMatchResultSchema.parse(req.body);
    await submitResultUseCase.execute(req.params.matchId, dto.sets);
    const match = await tournamentRepo.findMatch(req.params.matchId);
    res.json(match);
  },

  async listStandings(req: Request, res: Response): Promise<void> {
    const standings = await tournamentRepo.listStandings(req.params.id);
    res.json(standings);
  },

  async listMatches(req: Request, res: Response): Promise<void> {
    const matches = await tournamentRepo.listMatches(req.params.id);
    res.json(matches);
  },
};
