import { TournamentRepository } from '../../infrastructure/repositories/tournament.repository';
import { PlayerRepository } from '../../infrastructure/repositories/player.repository';
import { RankingRepository } from '../../infrastructure/repositories/ranking.repository';
import { MatchScoringService } from '../../domain/services/match-scoring.service';
import { StandingsCalculator } from '../../domain/services/standings-calculator.service';
import { MatchMode, SetScore } from '../../domain/entities/types';
import { ConflictError, NotFoundError } from '../../domain/errors';
import { eventBus } from '../../infrastructure/database/event-bus';

/**
 * SubmitMatchResultUseCase
 *
 * Core hot-path of the system. On every match result:
 *   1. Validate score per match mode.
 *   2. Persist match + sets + winner.
 *   3. Recompute full tournament standings.
 *   4. If all matches are done → mark tournament FINISHED and award points
 *      to the per-category ranking.
 *   5. Emit domain events (WebSocket push, notifications).
 *
 * Step 3 is ALWAYS a full recompute — this is O(N²) for a Super 8 (tiny) and
 * keeps the logic simple and idempotent. Re-submitting a score fixes the
 * standings automatically.
 */
export class SubmitMatchResultUseCase {
  constructor(
    private readonly tournamentRepo: TournamentRepository,
    private readonly playerRepo: PlayerRepository,
    private readonly rankingRepo: RankingRepository,
    private readonly scoring: MatchScoringService = new MatchScoringService(),
    private readonly calculator: StandingsCalculator = new StandingsCalculator(),
  ) {}

  async execute(matchId: string, sets: SetScore[]): Promise<void> {
    const match = await this.tournamentRepo.findMatch(matchId);
    if (!match) throw new NotFoundError('Match', matchId);

    const tournament = await this.tournamentRepo.findById(match.tournamentId);
    if (!tournament) throw new NotFoundError('Tournament', match.tournamentId);
    if (tournament.status !== 'IN_PROGRESS') {
      throw new ConflictError(
        `Cannot submit result — tournament is ${tournament.status}`,
      );
    }

    // 1. Validate
    const summary = this.scoring.validateAndSummarize({
      matchId,
      mode: tournament.matchMode as MatchMode,
      sets,
    });

    const winnerId =
      summary.winner === 'A' ? match.playerAId : match.playerBId;

    // 2. Persist match result
    await this.tournamentRepo.updateMatch(matchId, {
      status: 'FINISHED',
      winnerId,
      sets: sets as unknown as any,
      setsWonA: summary.setsWonA,
      setsWonB: summary.setsWonB,
      gamesWonA: summary.gamesWonA,
      gamesWonB: summary.gamesWonB,
      finishedAt: new Date(),
    });

    // 3. Recompute standings from scratch
    const entries = await this.tournamentRepo.listEntries(tournament.id);
    const matches = await this.tournamentRepo.listMatches(tournament.id);
    const playerIds = entries.map((e) => e.playerId);
    const matchSummaries = matches.map((m) => this.tournamentRepo.toMatchSummary(m));
    const standings = this.calculator.compute(playerIds, matchSummaries);

    await this.tournamentRepo.upsertStandings(
      tournament.id,
      standings.map((s) => ({
        playerId: s.playerId,
        matchesPlayed: s.matchesPlayed,
        wins: s.wins,
        losses: s.losses,
        setsWon: s.setsWon,
        setsLost: s.setsLost,
        gamesWon: s.gamesWon,
        gamesLost: s.gamesLost,
        setDifference: s.setDifference,
        gameDifference: s.gameDifference,
        points: s.points,
        position: s.position ?? null,
      })),
    );

    eventBus.emit({ type: 'match.finished', tournamentId: tournament.id, matchId });
    eventBus.emit({ type: 'standings.updated', tournamentId: tournament.id });

    // 4. Auto-finish if every match is done
    const allFinished = matches.every((m) => m.status === 'FINISHED');
    if (allFinished) {
      await this.finishTournament(tournament.id, tournament.categoryId, standings);
    }
  }

  /**
   * When all matches are played:
   *   - Mark tournament FINISHED.
   *   - Award per-category ranking points based on final position.
   *   - Emit tournament.finished for downstream circuit aggregation.
   */
  private async finishTournament(
    tournamentId: string,
    categoryId: string,
    standings: Array<{ playerId: string; position?: number; wins: number; losses: number }>,
  ): Promise<void> {
    await this.tournamentRepo.update(tournamentId, {
      status: 'FINISHED',
      finishedAt: new Date(),
    });

    // Award category ranking points — simple scale, organizers can edit circuit
    // point tables directly. This is the "category ranking" not the "circuit ranking".
    const categoryPointsByPosition: Record<number, number> = {
      1: 100, 2: 70, 3: 50, 4: 35, 5: 25, 6: 15, 7: 10, 8: 5,
    };

    for (const s of standings) {
      const pts = s.position ? categoryPointsByPosition[s.position] ?? 0 : 0;
      await this.rankingRepo.upsert(s.playerId, categoryId, {
        points: pts,
        tournamentsPlayed: 1,
        wins: s.wins,
        losses: s.losses,
      });
      // Keep denormalized aggregate on Player in sync
      if (pts > 0) {
        await this.playerRepo.incrementRankingPoints(s.playerId, pts);
      }
    }

    eventBus.emit({ type: 'tournament.finished', tournamentId });
    eventBus.emit({ type: 'ranking.updated', categoryId });
  }
}
