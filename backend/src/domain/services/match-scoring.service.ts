import { MatchMode, SetScore, MatchResultInput } from '../entities/types';
import { InvalidScoreError } from '../errors';

/**
 * MatchScoringService
 *
 * Single source of truth for how a set/match is valid.
 *
 * STANDARD Beach Tennis rules:
 *   - 6 games per set.
 *   - 5-5 → play until 7-5 (so 7-5 is a valid set end).
 *   - 6-6 → tiebreak to 7 (recorded as 7-6 with `tiebreak: true`).
 *   - Must win by 2 games (except 7-6 via tiebreak, where margin is exactly 1).
 *   - Best of 3 sets (majority = winner).
 *
 * PRO MODE:
 *   - Play up to 2 sets (same 6-game/tiebreak rules as STANDARD).
 *   - If split 1-1 in sets, decide with a SUPER TIEBREAK to 10 (win by 2).
 *     This super tiebreak is recorded as the 3rd "set" with `tiebreak: true`
 *     and scores like { a: 10, b: 8 }.
 */
export class MatchScoringService {
  // ---------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------

  /**
   * Validates a full match result and returns the aggregated outcome.
   * Throws InvalidScoreError on any inconsistency.
   */
  validateAndSummarize(input: MatchResultInput): {
    setsWonA: number;
    setsWonB: number;
    gamesWonA: number;
    gamesWonB: number;
    winner: 'A' | 'B';
  } {
    const { sets, mode } = input;

    if (!Array.isArray(sets) || sets.length === 0) {
      throw new InvalidScoreError('at least one set is required');
    }

    // Validate & tally
    let setsWonA = 0;
    let setsWonB = 0;
    let gamesWonA = 0;
    let gamesWonB = 0;

    // Ordinary sets (index 0..1) vs super tiebreak (only in PRO when 1-1)
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const isSuperTiebreak =
        mode === 'PRO' && i === 2 && setsWonA === 1 && setsWonB === 1;

      if (isSuperTiebreak) {
        this.assertSuperTiebreak(set);
      } else {
        this.assertRegularSet(set);
      }

      if (set.a > set.b) setsWonA++;
      else setsWonB++;

      // In the super tiebreak the "games" are actually TB points; we still sum them
      // because gameDifference is only used as a tie-breaker, and a PRO-mode super
      // tiebreak being counted as 1 game won makes more sense than counting 10 games.
      if (isSuperTiebreak) {
        gamesWonA += set.a > set.b ? 1 : 0;
        gamesWonB += set.b > set.a ? 1 : 0;
      } else {
        gamesWonA += set.a;
        gamesWonB += set.b;
      }
    }

    // Mode-specific structural validation
    if (mode === 'STANDARD') {
      // Best of 3. Must end when someone reaches 2 sets won; max 3 sets.
      if (sets.length < 2 || sets.length > 3) {
        throw new InvalidScoreError('STANDARD match must have 2 or 3 sets');
      }
      if (setsWonA !== 2 && setsWonB !== 2) {
        throw new InvalidScoreError('no player reached 2 sets won');
      }
      // If someone already won after 2 sets, there must not be a 3rd
      if (sets.length === 3 && (setsWonA === 2 && setsWonB === 0 || setsWonA === 0 && setsWonB === 2)) {
        // The only way to reach a 3rd set is a 1-1 split after 2 sets.
        // If we got here with 2-0 or 0-2 there's a third set which is wrong.
        throw new InvalidScoreError('extra set played after match was decided');
      }
    } else {
      // PRO
      if (sets.length < 1 || sets.length > 3) {
        throw new InvalidScoreError('PRO match must have 1, 2 or 3 entries');
      }
      // After the two regular sets: if someone is 2-0 → done; if 1-1 → super TB required
      if (sets.length === 2 && setsWonA === 1 && setsWonB === 1) {
        throw new InvalidScoreError('PRO match tied 1-1 needs super tiebreak');
      }
      if (sets.length === 3) {
        // The third entry must be a super tiebreak AND the first two must be 1-1
        if (!(setsWonA === 2 || setsWonB === 2)) {
          throw new InvalidScoreError('invalid PRO match state after 3 sets');
        }
      }
    }

    return {
      setsWonA,
      setsWonB,
      gamesWonA,
      gamesWonB,
      winner: setsWonA > setsWonB ? 'A' : 'B',
    };
  }

  // ---------------------------------------------------------
  // SET VALIDATION
  // ---------------------------------------------------------

  private assertRegularSet(set: SetScore): void {
    const { a, b } = set;
    this.assertNonNegativeInt(a, 'games won by A');
    this.assertNonNegativeInt(b, 'games won by B');

    if (a === b) {
      throw new InvalidScoreError(`set cannot end tied (${a}-${b})`);
    }

    const hi = Math.max(a, b);
    const lo = Math.min(a, b);

    // Tiebreak case: 7-6 — margin of 1 is ONLY ok when hi=7 & lo=6
    if (set.tiebreak) {
      if (!(hi === 7 && lo === 6)) {
        throw new InvalidScoreError(
          `tiebreak set must end 7-6, got ${a}-${b}`,
        );
      }
      return;
    }

    // Non-tiebreak endings:
    //   6-0, 6-1, 6-2, 6-3, 6-4       (winner reaches 6 with margin ≥ 2)
    //   7-5                            (after 5-5)
    // Anything else is invalid.
    if (hi === 6 && lo <= 4) return;
    if (hi === 7 && lo === 5) return;

    throw new InvalidScoreError(
      `set score ${a}-${b} is not a valid STANDARD set ending`,
    );
  }

  private assertSuperTiebreak(set: SetScore): void {
    const { a, b } = set;
    this.assertNonNegativeInt(a, 'super tiebreak points A');
    this.assertNonNegativeInt(b, 'super tiebreak points B');

    if (a === b) {
      throw new InvalidScoreError(`super tiebreak cannot end tied (${a}-${b})`);
    }

    const hi = Math.max(a, b);
    const lo = Math.min(a, b);

    // Must reach at least 10, win by 2
    if (hi < 10) {
      throw new InvalidScoreError(
        `super tiebreak must reach 10, got ${a}-${b}`,
      );
    }
    if (hi - lo < 2) {
      throw new InvalidScoreError(
        `super tiebreak must be won by 2, got ${a}-${b}`,
      );
    }
    // If hi > 10, the lo must equal hi - 2 (e.g. 12-10, 15-13 — both valid)
    if (hi > 10 && hi - lo !== 2) {
      throw new InvalidScoreError(
        `super tiebreak ${a}-${b} exceeds 10 without a 2-point margin`,
      );
    }
  }

  private assertNonNegativeInt(n: number, label: string): void {
    if (!Number.isInteger(n) || n < 0) {
      throw new InvalidScoreError(`${label} must be a non-negative integer`);
    }
  }
}
