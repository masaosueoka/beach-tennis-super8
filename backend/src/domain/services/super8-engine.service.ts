import { RoundRobinPairing } from '../entities/types';
import { ValidationError } from '../errors';

/**
 * Super8Engine
 *
 * Handles the draw and the round-robin schedule for a Super 8 tournament.
 *
 * A Super 8 has up to 8 players, each faces every other → C(8,2) = 28 matches.
 * For 7 players: 21 matches. 6: 15. etc. We always use a single round-robin.
 *
 * Scheduling uses the classic "circle method" — every player plays exactly
 * one match per round, and we get (N-1) rounds for N players (N even).
 * When N is odd, we add a phantom "bye" slot.
 */
export class Super8Engine {
  static readonly MAX_PLAYERS = 8;
  static readonly MIN_PLAYERS = 3; // below 3 a round-robin is meaningless

  /**
   * Shuffle players with Fisher-Yates and return their IDs ordered as seeds 1..N.
   * Deterministic when a seeded RNG is supplied (useful for tests).
   */
  draw(playerIds: string[], rng: () => number = Math.random): string[] {
    if (playerIds.length < Super8Engine.MIN_PLAYERS) {
      throw new ValidationError(
        `need at least ${Super8Engine.MIN_PLAYERS} players, got ${playerIds.length}`,
      );
    }
    if (playerIds.length > Super8Engine.MAX_PLAYERS) {
      throw new ValidationError(
        `maximum ${Super8Engine.MAX_PLAYERS} players for a Super 8`,
      );
    }
    if (new Set(playerIds).size !== playerIds.length) {
      throw new ValidationError('duplicate player ids in draw');
    }

    const shuffled = [...playerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate a full round-robin schedule using the circle method.
   *
   * Given seeded players [p1, p2, ..., pN] (N up to 8), produces an array of
   * pairings with sequential roundNumber. Each player plays at most once per
   * round. The output length is exactly C(N, 2).
   */
  generateRoundRobin(seededPlayerIds: string[]): RoundRobinPairing[] {
    if (seededPlayerIds.length < Super8Engine.MIN_PLAYERS) {
      throw new ValidationError('not enough players for round-robin');
    }

    // Circle method works with an even count — add a BYE if odd
    const BYE = '__BYE__';
    const players = [...seededPlayerIds];
    if (players.length % 2 === 1) players.push(BYE);

    const n = players.length;
    const rounds = n - 1;
    const half = n / 2;

    // We'll rotate all but the first position
    const arr = [...players];
    const pairings: RoundRobinPairing[] = [];

    for (let round = 1; round <= rounds; round++) {
      for (let i = 0; i < half; i++) {
        const a = arr[i];
        const b = arr[n - 1 - i];
        if (a !== BYE && b !== BYE) {
          pairings.push({
            roundNumber: round,
            playerAId: a,
            playerBId: b,
          });
        }
      }
      // Rotate: keep arr[0] fixed, rotate the rest clockwise
      const fixed = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop()!);
      arr.splice(0, arr.length, fixed, ...rest);
    }

    return pairings;
  }

  /**
   * Convenience: draw + schedule in one call.
   */
  drawAndSchedule(
    playerIds: string[],
    rng?: () => number,
  ): { seeds: string[]; pairings: RoundRobinPairing[] } {
    const seeds = this.draw(playerIds, rng);
    const pairings = this.generateRoundRobin(seeds);
    return { seeds, pairings };
  }
}
