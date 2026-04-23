import { TournamentRepository } from '../../infrastructure/repositories/tournament.repository';
import { Super8Engine } from '../../domain/services/super8-engine.service';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';
import { eventBus } from '../../infrastructure/database/event-bus';

/**
 * StartTournamentUseCase
 *
 * Transitions a tournament from OPEN → IN_PROGRESS:
 *   1. Loads registered players.
 *   2. Draws the seeding.
 *   3. Generates the full round-robin schedule (circle method).
 *   4. Persists matches.
 *   5. Initializes empty standings rows.
 *
 * Idempotency: if the tournament is already IN_PROGRESS, throws ConflictError.
 */
export class StartTournamentUseCase {
  constructor(
    private readonly tournamentRepo: TournamentRepository,
    private readonly engine: Super8Engine = new Super8Engine(),
  ) {}

  async execute(tournamentId: string): Promise<{ seeds: string[]; matchCount: number }> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) throw new NotFoundError('Tournament', tournamentId);
    if (tournament.status === 'IN_PROGRESS') {
      throw new ConflictError('Tournament is already in progress');
    }
    if (tournament.status === 'FINISHED' || tournament.status === 'CANCELED') {
      throw new ConflictError(`Cannot start tournament in status ${tournament.status}`);
    }

    const entries = await this.tournamentRepo.listEntries(tournamentId);
    if (entries.length < Super8Engine.MIN_PLAYERS) {
      throw new ValidationError(
        `at least ${Super8Engine.MIN_PLAYERS} players required, got ${entries.length}`,
      );
    }

    // Draw: shuffle the players and reassign seed numbers 1..N
    const playerIds = entries.map((e) => e.playerId);
    const { seeds, pairings } = this.engine.drawAndSchedule(playerIds);

    const newEntries = seeds.map((playerId, idx) => ({
      playerId,
      seedNumber: idx + 1,
    }));

    // Replace entries with new seeded order; generate matches; flip status
    await this.tournamentRepo.setEntries(tournamentId, newEntries);
    await this.tournamentRepo.createMatches(
      tournamentId,
      pairings.map((p) => ({
        playerAId: p.playerAId,
        playerBId: p.playerBId,
        roundNumber: p.roundNumber,
      })),
    );
    await this.tournamentRepo.update(tournamentId, {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    });

    // Initialize empty standings so the dashboard shows every player right away
    await this.tournamentRepo.upsertStandings(
      tournamentId,
      seeds.map((playerId) => ({
        playerId,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        setDifference: 0,
        gameDifference: 0,
        points: 0,
        position: null,
      })),
    );

    eventBus.emit({ type: 'standings.updated', tournamentId });

    return { seeds, matchCount: pairings.length };
  }
}
