import { MatchSummary, PlayerStanding } from '../entities/types';

/**
 * StandingsCalculator
 *
 * Computes the final (or live) standings for a Super 8 tournament from
 * finished match rows. It is PURE — no DB calls, easy to test.
 *
 * Tie-breaking chain (in order of priority):
 *   1. points             (wins × POINTS_PER_WIN)
 *   2. sets won
 *   3. set difference     (setsWon - setsLost)
 *   4. game difference    (gamesWon - gamesLost)
 *   5. head-to-head       (only among the still-tied subset)
 *
 * If head-to-head still cannot separate players, seed order is used as the
 * final stable tie-break (kept by JS's stable `sort`).
 */
export class StandingsCalculator {
  static readonly POINTS_PER_WIN = 3;
  static readonly POINTS_PER_LOSS = 0;
  // For WALKOVER losses we still give 0; wins still give 3. Adjust here if needed.

  /**
   * Build standings from match summaries.
   *
   * @param playerIds  All players in the tournament, in seed order.
   *                   Non-participating matches are ignored.
   * @param matches    Match summaries; unfinished matches are skipped in totals.
   */
  compute(playerIds: string[], matches: MatchSummary[]): PlayerStanding[] {
    // 1. Initialize one PlayerStanding per player (even if they haven't played yet)
    const byId = new Map<string, PlayerStanding>();
    for (const id of playerIds) {
      byId.set(id, this.emptyStanding(id));
    }

    // 2. Aggregate finished matches
    for (const m of matches) {
      if (!m.finished || !m.winnerId) continue;
      const a = byId.get(m.playerAId);
      const b = byId.get(m.playerBId);
      if (!a || !b) continue; // defensive

      a.matchesPlayed++;
      b.matchesPlayed++;

      a.setsWon += m.setsWonA;
      a.setsLost += m.setsWonB;
      b.setsWon += m.setsWonB;
      b.setsLost += m.setsWonA;

      a.gamesWon += m.gamesWonA;
      a.gamesLost += m.gamesWonB;
      b.gamesWon += m.gamesWonB;
      b.gamesLost += m.gamesWonA;

      if (m.winnerId === m.playerAId) {
        a.wins++;
        b.losses++;
      } else {
        b.wins++;
        a.losses++;
      }
    }

    // 3. Derived fields
    for (const s of byId.values()) {
      s.setDifference = s.setsWon - s.setsLost;
      s.gameDifference = s.gamesWon - s.gamesLost;
      s.points = s.wins * StandingsCalculator.POINTS_PER_WIN;
    }

    // 4. Sort with tie-breakers (incl. head-to-head within tied group)
    const standings = Array.from(byId.values());
    const finishedMatches = matches.filter((m) => m.finished && m.winnerId);
    const sorted = this.sortWithTieBreakers(standings, finishedMatches);

    // 5. Assign positions (1-indexed)
    sorted.forEach((s, idx) => {
      s.position = idx + 1;
    });

    return sorted;
  }

  // ---------------------------------------------------------
  // SORTING
  // ---------------------------------------------------------

  private sortWithTieBreakers(
    standings: PlayerStanding[],
    matches: MatchSummary[],
  ): PlayerStanding[] {
    // We sort greedily on criteria 1..4. Wherever we find a group of >=2 players
    // that are still exactly tied on all of 1..4, we resolve them with H2H.

    // Initial sort on 1..4
    const sorted = [...standings].sort((x, y) => this.compareNonH2H(x, y));

    // Walk through tied clusters and resolve them with H2H
    const result: PlayerStanding[] = [];
    let i = 0;
    while (i < sorted.length) {
      let j = i + 1;
      while (j < sorted.length && this.compareNonH2H(sorted[i], sorted[j]) === 0) {
        j++;
      }
      // sorted[i..j-1] are tied on criteria 1..4
      if (j - i <= 1) {
        result.push(sorted[i]);
      } else {
        const tied = sorted.slice(i, j);
        const resolved = this.resolveHeadToHead(tied, matches);
        result.push(...resolved);
      }
      i = j;
    }

    return result;
  }

  /** Compares criteria 1..4. Returns <0 if a should come BEFORE b. */
  private compareNonH2H(a: PlayerStanding, b: PlayerStanding): number {
    if (b.points !== a.points) return b.points - a.points;
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    if (b.setDifference !== a.setDifference) return b.setDifference - a.setDifference;
    if (b.gameDifference !== a.gameDifference) return b.gameDifference - a.gameDifference;
    return 0;
  }

  /**
   * Resolve a group of tied players with the head-to-head sub-ranking.
   *
   * We build a mini-ranking that only counts matches BETWEEN the tied players,
   * then apply criteria 1..4 again on that sub-ranking. Anyone still tied is
   * left in the input order (stable sort == seed order).
   */
  private resolveHeadToHead(
    tied: PlayerStanding[],
    allMatches: MatchSummary[],
  ): PlayerStanding[] {
    const tiedIds = new Set(tied.map((p) => p.playerId));
    const subMatches = allMatches.filter(
      (m) => tiedIds.has(m.playerAId) && tiedIds.has(m.playerBId),
    );

    // If there are no matches among them yet (live standings), return as-is.
    if (subMatches.length === 0) return tied;

    // Build sub-standings
    const sub = new Map<string, PlayerStanding>();
    for (const p of tied) sub.set(p.playerId, this.emptyStanding(p.playerId));

    for (const m of subMatches) {
      if (!m.finished || !m.winnerId) continue;
      const a = sub.get(m.playerAId)!;
      const b = sub.get(m.playerBId)!;

      a.matchesPlayed++;
      b.matchesPlayed++;
      a.setsWon += m.setsWonA;
      a.setsLost += m.setsWonB;
      b.setsWon += m.setsWonB;
      b.setsLost += m.setsWonA;
      a.gamesWon += m.gamesWonA;
      a.gamesLost += m.gamesWonB;
      b.gamesWon += m.gamesWonB;
      b.gamesLost += m.gamesWonA;

      if (m.winnerId === m.playerAId) {
        a.wins++;
        b.losses++;
      } else {
        b.wins++;
        a.losses++;
      }
    }

    for (const s of sub.values()) {
      s.setDifference = s.setsWon - s.setsLost;
      s.gameDifference = s.gamesWon - s.gamesLost;
      s.points = s.wins * StandingsCalculator.POINTS_PER_WIN;
    }

    // Sort tied array by the sub-standings
    return [...tied].sort((x, y) => {
      const sx = sub.get(x.playerId)!;
      const sy = sub.get(y.playerId)!;
      return this.compareNonH2H(sx, sy);
    });
  }

  private emptyStanding(playerId: string): PlayerStanding {
    return {
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
    };
  }
}
