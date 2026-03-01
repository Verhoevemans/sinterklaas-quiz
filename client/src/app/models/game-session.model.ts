import { Player } from './player.model';
import { Question } from './question.model';

export type GameState = 'lobby' | 'in-progress' | 'completed';

export interface GameSession {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  questionCount: number;
  currentQuestionIndex: number;
  questions: Question[];
  state: GameState;
  createdAt: Date;
}
