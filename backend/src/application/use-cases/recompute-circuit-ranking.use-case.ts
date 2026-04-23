import { CircuitRepository } from '../../infrastructure/repositories/circuit.repository';
import { TournamentRepository } from '../../infrastructure/repositories/tournament.repository';
import { PlayerRepository } from '../../infrastructure/repositories/player.repository';
import { CircuitScoringService } from '../../domain/services/circuit-scoring.service';
import { NotFoundError } from '../../domain/errors';
import { eventBus } from '../../infrastructure/database/event-bus';

/**
 * RecomputeCircuitRankingUseCase
 *
 * After a tournament belonging to a stage finishes:
 *   1. Score the stage (position → pointsEarned via circuit's pointsTable)
 *   2. Persist StageResult rows
 *   3. Aggregate CircuitRanking from ALL stage results of the circuit
 *   4. Sync denormalized Player.circuitPoints
 *
 * This is idempotent — re-running after a correction produces the same result.
 */
export class RecomputeCircuitRankingUseCase {
  constructor(
    private readonly circuitRepo: CircuitRepository,
    private readonly tournamentRepo: TournamentRepository,
    private readonly playerRepo: PlayerRepository,
    private readonly scoring: CircuitScoringService = new CircuitScoringService(),
  ) {}

  /**
   * Trigger: a stage tournament just finished.
   */
  async onTournamentFinished(tournamentId: string): Promise<void> {
    const tournament = await this.tournamentRepo.findByIdWithRelations(tournamentId);
    if (!tournament?.stageId) return; // not part of a circuit — skip

    const stage = await this.circuitRepo.findStage(tournament.stageId);
    if (!stage) throw new NotFoundError('Stage', tournament.stageId);

    const circuit = await this.circuitRepo.findById(stage.circuitId);
    if (!circuit) throw new NotFoundError('Circuit', stage.circuitId);

    // 1. Score the stage using the circuit's points table
    const standings = tournament.standings
      .filter((s) => s.position !== null)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((s) => ({ playerId: s.playerId, position: s.position! }));

    const scored = this.scoring.scoreStage(
      standings,
      circuit.pointsTable as Record<string, number>,
    );

    await this.circuitRepo.replaceStageResults(stage.id, scored);
    await this.circuitRepo.markStageFinished(stage.id);
    eventBus.emit({ type: 'stage.finished', stageId: stage.id });

    // 2. Recompute circuit-wide ranking from ALL stage results
    const allResults = await this.circuitRepo.listStageResultsByCircuit(circuit.id);
    const aggregated = this.scoring.aggregateCircuitRanking(
      allResults.map((r) => ({
        playerId: r.playerId,
        position: r.position,
        pointsEarned: r.pointsEarned,
      })),
    );

    await this.circuitRepo.upsertCircuitRanking(
      circuit.id,
      aggregated.map((r) => ({
        playerId: r.playerId,
        totalPoints: r.totalPoints,
        stagesPlayed: r.stagesPlayed,
        bestPosition: r.bestPosition,
      })),
    );

    // 3. Sync denormalized Player.circuitPoints (sum across active circuits is
    //    approximated by replacing with this circuit's total — if a player is
    //    in multiple active circuits, upgrade this to a proper recompute).
    for (const row of aggregated) {
      // Using update with "set" because we're authoritative here
      await this.playerRepo.update(row.playerId, { circuitPoints: row.totalPoints });
    }

    eventBus.emit({ type: 'circuit.ranking.updated', circuitId: circuit.id });
  }
}
