/**
 * Domain types — pure, no framework coupling.
 * These represent the business concepts; infrastructure maps to/from these.
 */

export type MatchMode = 'STANDARD' | 'PRO';

export interface SetScore {
  a: number;
  b: number;
  /** true when this set was decided by a (super) tiebreak */
  tiebreak?: boolean;
}

export interface MatchResultInput {
  matchId: string;
  mode: MatchMode;
  sets: SetScore[];
}

export interface PlayerStanding {
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
  position?: number;
}

export interface MatchSummary {
  id: string;
  playerAId: string;
  playerBId: string;
  winnerId: string | null;
  setsWonA: number;
  setsWonB: number;
  gamesWonA: number;
  gamesWonB: number;
  roundNumber: number;
  finished: boolean;
}

export interface RoundRobinPairing {
  roundNumber: number;
  playerAId: string;
  playerBId: string;
}
