export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type MatchState = 'PENDING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type SeriesStatus = 'CREATED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'ONGOING' | 'COMPLETED';
export type SubmissionLanguage = 'JAVA' | 'CPP';
export type SubmissionVerdict =
  | 'PENDING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'INTERNAL_ERROR';

export interface ProblemResponse {
  id: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  timeLimitMillis: number;
  memoryLimitMb: number;
  sampleInput?: string;
  sampleOutput?: string;
  testcasesJson: string;
  createdByUsername?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProblemRequest {
  title: string;
  description: string;
  difficulty: Difficulty;
  timeLimitMillis?: number;
  memoryLimitMb?: number;
  sampleInput?: string;
  sampleOutput?: string;
  testcasesJson: string;
}

export interface ParticipantDto {
  id: number;
  username: string;
  rating: number;
}

export interface MatchSummaryDto {
  id: number;
  round: number;
  player1Id: number;
  player1Username: string;
  player2Id: number;
  player2Username: string;
  winnerId?: number;
  winnerUsername?: string;
  state: MatchState;
}

export interface RoundDto {
  roundNumber: number;
  problemTitle: string;
  matches: MatchSummaryDto[];
}

export interface SeriesSummaryResponse {
  id: number;
  name: string;
  size: number;
  joinedCount: number;
  status: SeriesStatus;
  currentRound: number;
  startsAt?: string;
  createdAt: string;
}

export interface SeriesDetailResponse {
  id: number;
  name: string;
  size: number;
  status: SeriesStatus;
  currentRound: number;
  startsAt?: string;
  participants: ParticipantDto[];
  rounds: RoundDto[];
}

export interface CreateSeriesRequest {
  name: string;
  size: number;
  startsAt: string;
  roundProblems: Record<number, number>;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface MatchResponse {
  id: number;
  seriesId?: number;
  seriesName?: string;
  round: number;
  state: MatchState;
  player1Id?: number;
  player1Username?: string;
  player2Id?: number;
  player2Username?: string;
  opponentId?: number;
  opponentUsername?: string;
  winnerId?: number;
  winnerUsername?: string;
  problem?: ProblemResponse;
  latestSubmissionVerdict?: SubmissionVerdict | string;
  latestSubmissionLanguage?: SubmissionLanguage | string;
  latestSubmissionCode?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface CreateSubmissionRequest {
  language: SubmissionLanguage;
  code: string;
}

export interface SubmissionResponse {
  id: number;
  matchId: number;
  userId: number;
  username: string;
  language: SubmissionLanguage;
  code: string;
  verdict: SubmissionVerdict;
  createdAt: string;
}

export interface SubmissionUpdateMessage {
  id: number;
  matchId: number;
  userId: number;
  username: string;
  language: SubmissionLanguage;
  verdict: SubmissionVerdict;
  createdAt: string;
}

export interface RecentMatchDto {
  matchId: number;
  seriesId?: number;
  seriesName?: string;
  round: number;
  opponentUsername: string;
  result: string;
  endedAt?: string;
  createdAt: string;
}

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
  createdAt: string;
  recentMatches: RecentMatchDto[];
}

export interface AuthResponse {
  token: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface MatchmakingResponse {
  status: 'QUEUED' | 'MATCHED' | 'IDLE' | 'CANCELLED';
  matchId?: number;
  opponentUsername?: string;
  opponentRating?: number;
  userRating?: number;
  minRating?: number;
  maxRating?: number;
  message?: string;
}
