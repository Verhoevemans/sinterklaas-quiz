export interface PlayerAnswer {
  questionId: string;
  selectedIndex: number;
  timestamp: number;
  isCorrect: boolean;
}

export interface Player {
  id: string;
  nickname: string;
  score: number;
  answers: PlayerAnswer[];
  isHost: boolean;
}
