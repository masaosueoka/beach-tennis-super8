export type Role = 'ADMIN' | 'ORGANIZER' | 'REFEREE' | 'PLAYER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  type: 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN';
  description?: string | null;
}

export interface Player {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  photoUrl?: string | null;
  rankingPoints: number;
  circuitPoints: number;
  active: boolean;
  categories?: { category: Category }[];
}

export type TournamentStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELED';
export type MatchMode = 'STANDARD' | 'PRO';

export interface Tournament {
  id: string;
  name: string;
  categoryId: string;
  matchMode: MatchMode;
  status: TournamentStatus;
  maxPlayers: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  registrationFee?: number | null;
  category?: Category;
  entries?: TournamentEntry[];
  matches?: Match[];
  standings?: Standing[];
  _count?: { entries: number; matches: number };
}

export interface TournamentEntry {
  tournamentId: string;
  playerId: string;
  seedNumber: number;
  player: Player;
}

export type MatchStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'WALKOVER'
  | 'CANCELED';

export interface SetScore {
  a: number;
  b: number;
  tiebreak?: boolean;
}

export interface Match {
  id: string;
  tournamentId: string;
  roundNumber: number;
  playerAId: string;
  playerBId: string;
  status: MatchStatus;
  winnerId?: string | null;
  sets?: SetScore[] | null;
  setsWonA: number;
  setsWonB: number;
  gamesWonA: number;
  gamesWonB: number;
}

export interface Standing {
  tournamentId: string;
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
  position?: number | null;
  player?: Player;
}

export interface Circuit {
  id: string;
  name: string;
  categoryId: string;
  status: 'UPCOMING' | 'ACTIVE' | 'FINISHED';
  startDate?: string | null;
  endDate?: string | null;
  pointsTable: Record<string, number>;
  stages?: Stage[];
  category?: Category;
}

export interface Stage {
  id: string;
  circuitId: string;
  name: string;
  stageNumber: number;
  scheduledAt?: string | null;
  finishedAt?: string | null;
  tournaments?: Tournament[];
}

export interface CircuitRanking {
  circuitId: string;
  playerId: string;
  totalPoints: number;
  stagesPlayed: number;
  bestPosition?: number | null;
  player: Player;
}

export interface RankingEntry {
  playerId: string;
  categoryId: string;
  points: number;
  tournamentsPlayed: number;
  wins: number;
  losses: number;
  player: Player;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  link?: string | null;
  active: boolean;
  priority: number;
}
