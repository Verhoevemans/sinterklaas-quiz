import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Player, Question, PlayerAnswer } from '../models';

const SOCKET_URL: string = 'http://localhost:3000';

export interface GameStateData {
  game: {
    code: string;
    state: 'lobby' | 'in-progress' | 'completed';
    players: Array<{
      id: string;
      nickname: string;
      score: number;
      isHost: boolean;
    }>;
    currentQuestionIndex: number;
    questionCount: number;
  };
}

export interface PlayerJoinedData {
  player: {
    id: string;
    nickname: string;
    isHost: boolean;
  };
  playerCount: number;
}

export interface PlayerLeftData {
  playerId: string;
  nickname: string;
}

export interface GameStartedData {
  question: {
    id: string;
    text: string;
    options: string[];
    questionType: string;
    imageUrl?: string;
  };
  questionIndex: number;
  totalQuestions: number;
}

export interface AnswerResultData {
  isCorrect: boolean;
  correctAnswerIndex: number;
  explanation: string;
  newScore: number;
}

export interface PlayerAnsweredData {
  playerId: string;
  nickname: string;
}

export interface QuestionChangedData {
  question: {
    id: string;
    text: string;
    options: string[];
    questionType: string;
    imageUrl?: string;
  };
  questionIndex: number;
  totalQuestions: number;
  scores: Array<{
    id: string;
    nickname: string;
    score: number;
  }>;
}

export interface GameEndedData {
  players: Array<{
    id: string;
    nickname: string;
    score: number;
    answers: PlayerAnswer[];
    isHost: boolean;
  }>;
  questions: Array<{
    id: string;
    text: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }>;
  endedEarly?: boolean;
}

export interface SocketError {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private socket: Socket | null = null;

  public readonly connected = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  // Event signals
  public readonly gameState = signal<GameStateData | null>(null);
  public readonly playerJoined = signal<PlayerJoinedData | null>(null);
  public readonly playerLeft = signal<PlayerLeftData | null>(null);
  public readonly gameStarted = signal<GameStartedData | null>(null);
  public readonly answerResult = signal<AnswerResultData | null>(null);
  public readonly playerAnswered = signal<PlayerAnsweredData | null>(null);
  public readonly questionChanged = signal<QuestionChangedData | null>(null);
  public readonly gameEnded = signal<GameEndedData | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.disconnect();
    });
  }

  public connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected.set(true);
      this.error.set(null);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected.set(false);
    });

    this.socket.on('error', (data: SocketError) => {
      console.error('Socket error:', data.message);
      this.error.set(data.message);
    });

    this.socket.on('game-state', (data: GameStateData) => {
      this.gameState.set(data);
    });

    this.socket.on('player-joined', (data: PlayerJoinedData) => {
      this.playerJoined.set(data);
    });

    this.socket.on('player-left', (data: PlayerLeftData) => {
      this.playerLeft.set(data);
    });

    this.socket.on('game-started', (data: GameStartedData) => {
      this.gameStarted.set(data);
    });

    this.socket.on('answer-result', (data: AnswerResultData) => {
      this.answerResult.set(data);
    });

    this.socket.on('player-answered', (data: PlayerAnsweredData) => {
      this.playerAnswered.set(data);
    });

    this.socket.on('question-changed', (data: QuestionChangedData) => {
      this.questionChanged.set(data);
    });

    this.socket.on('game-ended', (data: GameEndedData) => {
      this.gameEnded.set(data);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected.set(false);
    }
  }

  public joinGame(gameCode: string, playerId: string): void {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('join-game', { gameCode, playerId });
  }

  public startGame(gameCode: string, playerId: string): void {
    this.socket?.emit('start-game', { gameCode, playerId });
  }

  public submitAnswer(
    gameCode: string,
    playerId: string,
    questionId: string,
    selectedIndex: number
  ): void {
    this.socket?.emit('submit-answer', { gameCode, playerId, questionId, selectedIndex });
  }

  public nextQuestion(gameCode: string, playerId: string): void {
    this.socket?.emit('next-question', { gameCode, playerId });
  }

  public endGame(gameCode: string, playerId: string): void {
    this.socket?.emit('end-game', { gameCode, playerId });
  }

  public clearError(): void {
    this.error.set(null);
  }

  public resetSignals(): void {
    this.gameState.set(null);
    this.playerJoined.set(null);
    this.playerLeft.set(null);
    this.gameStarted.set(null);
    this.answerResult.set(null);
    this.playerAnswered.set(null);
    this.questionChanged.set(null);
    this.gameEnded.set(null);
    this.error.set(null);
  }
}
