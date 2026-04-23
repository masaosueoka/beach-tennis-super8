import { ValidationError } from '../errors';

/**
 * CircuitScoringService
 *
 * Converts a finished stage's final standings (positions 1..N) into points
 * earned using a configurable per-circuit points table.
 *
 * The points table is a JSON map of placement → points, e.g.
 *   { "1": 100, "2": 80, "3": 60, "4": 45, "5": 30, "6": 20, "7": 10, "8": 5 }
 * Positions not present in the table award 0.
 *
 * This service is pure; the caller persists the StageResult rows and then
 * aggregates CircuitRanking totals.
 */
export class CircuitScoringService {
  /**
   * Apply the points table to a sorted list of (playerId, position).
   */
  scoreStage(
    finalStandings: Array<{ playerId: string; position: number }>,
    pointsTable: Record<string, number>,
  ): Array<{ playerId: string; position: number; pointsEarned: number }> {
    this.validatePointsTable(pointsTable);

    return finalStandings.map((s) => ({
      playerId: s.playerId,
      position: s.position,
      pointsEarned: pointsTable[String(s.position)] ?? 0,
    }));
  }

  /**
   * Aggregate an array of StageResult-like rows into a circuit ranking list,
   * sorted by total points DESC, then stages played ASC (fewer stages is a
   * slight preference when tied — rewarding efficiency), then best position.
   */
  aggregateCircuitRanking(
    stageResults: Array<{ playerId: string; position: number; pointsEarned: number }>,
  ): Array<{
    playerId: string;
    totalPoints: number;
    stagesPlayed: number;
    bestPosition: number;
    rank: number;
  }> {
    const agg = new Map<
      string,
      { totalPoints: number; stagesPlayed: number; bestPosition: number }
    >();

    for (const r of stageResults) {
      const cur = agg.get(r.playerId);
      if (!cur) {
        agg.set(r.playerId, {
          totalPoints: r.pointsEarned,
          stagesPlayed: 1,
          bestPosition: r.position,
        });
      } else {
        cur.totalPoints += r.pointsEarned;
        cur.stagesPlayed += 1;
        if (r.position < cur.bestPosition) cur.bestPosition = r.position;
      }
    }

    const rows = Array.from(agg.entries()).map(([playerId, v]) => ({
      playerId,
      ...v,
    }));

    rows.sort((x, y) => {
      if (y.totalPoints !== x.totalPoints) return y.totalPoints - x.totalPoints;
      if (x.bestPosition !== y.bestPosition) return x.bestPosition - y.bestPosition;
      return x.stagesPlayed - y.stagesPlayed;
    });

    return rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }

  private validatePointsTable(table: Record<string, number>): void {
    if (!table || typeof table !== 'object') {
      throw new ValidationError('pointsTable must be an object');
    }
    for (const [k, v] of Object.entries(table)) {
      if (!/^\d+$/.test(k)) {
        throw new ValidationError(`pointsTable key '${k}' must be a positive integer`);
      }
      if (!Number.isFinite(v) || v < 0) {
        throw new ValidationError(`pointsTable value for '${k}' must be a non-negative number`);
      }
    }
  }
}
