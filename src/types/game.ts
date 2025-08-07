export type GameStatus = 'waiting' | 'starting' | 'night' | 'day' | 'ended';
export type GamePhase = 'lobby' | 'night' | 'day' | 'voting' | 'ended';
export type Role = 'mafia' | 'doctor' | 'detective' | 'civilian';
export type VoteType = 'eliminate' | 'mafia_kill' | 'doctor_save' | 'detective_investigate';
export type MessageType = 'info' | 'action' | 'death' | 'victory';

export interface Game {
  id: string;
  room_code: string;
  host_id: string;
  status: GameStatus;
  current_phase: GamePhase;
  phase_end_time?: string;
  winner?: 'mafia' | 'town';
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  role?: Role;
  is_alive: boolean;
  is_ready: boolean;
  is_host: boolean;
  last_active: string;
  created_at: string;
}

export interface Vote {
  id: string;
  game_id: string;
  voter_id: string;
  target_id?: string;
  vote_type: VoteType;
  phase_number: number;
  created_at: string;
}

export interface GameLogEntry {
  id: string;
  game_id: string;
  message: string;
  message_type: MessageType;
  phase_number: number;
  created_at: string;
}

export interface GameState {
  game: Game | null;
  players: Player[];
  currentPlayer: Player | null;
  votes: Vote[];
  gameLog: GameLogEntry[];
  isLoading: boolean;
  error: string | null;
}

export const ROLE_DESCRIPTIONS = {
  mafia: "🔪 Eliminate townspeople at night. Win when you equal or outnumber the town.",
  doctor: "🏥 Save one person each night (including yourself). Help the town win.",
  detective: "🔍 Investigate one person each night to learn their role. Help the town win.",
  civilian: "👥 Vote during the day to eliminate the mafia. Help the town win."
} as const;

export const ROLE_EMOJIS = {
  mafia: "🔪",
  doctor: "🏥", 
  detective: "🔍",
  civilian: "👥"
} as const;