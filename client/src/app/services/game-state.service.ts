import { Injectable, signal, computed, effect, inject, Signal } from '@angular/core';
import { GameSession, Player, PlayerAnswer, Question } from '../models';
import { ApiService, CreateGameResponse, JoinGameResponse } from './api.service';
import {
  SocketService,
  GameStateData,
  GameStartedData,
  QuestionChangedData,
  AnswerResultData,
  GameEndedData,
} from './socket.service';

const STORAGE_KEY_PLAYER_ID: string = 'sinterklaas-quiz-player-id';
const STORAGE_KEY_GAME_CODE: string = 'sinterklaas-quiz-game-code';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly socketService: SocketService = inject(SocketService);

  private readonly currentGameCode = signal<string | null>(null);
  private readonly currentPlayerId = signal<string | null>(null);
  private readonly currentPlayers = signal<Player[]>([]);
  private readonly currentQuestion = signal<Question | null>(null);
  private readonly currentQuestionIndex = signal<number>(0);
  private readonly totalQuestions = signal<number>(0);
  private readonly currentState = signal<'lobby' | 'in-progress' | 'completed'>('lobby');
  private readonly lastAnswerResult = signal<AnswerResultData | null>(null);
  private readonly finalResults = signal<GameEndedData | null>(null);

  // Public computed signals
  public readonly gameCode: Signal<string | null> = this.currentGameCode.asReadonly();
  public readonly playerId: Signal<string | null> = this.currentPlayerId.asReadonly();
  public readonly players: Signal<Player[]> = this.currentPlayers.asReadonly();
  public readonly question: Signal<Question | null> = this.currentQuestion.asReadonly();
  public readonly questionIndex: Signal<number> = this.currentQuestionIndex.asReadonly();
  public readonly questionCount: Signal<number> = this.totalQuestions.asReadonly();
  public readonly state: Signal<'lobby' | 'in-progress' | 'completed'> =
    this.currentState.asReadonly();
  public readonly answerResult: Signal<AnswerResultData | null> = this.lastAnswerResult.asReadonly();
  public readonly results: Signal<GameEndedData | null> = this.finalResults.asReadonly();
  public readonly socketConnected: Signal<boolean> = this.socketService.connected;
  public readonly socketError: Signal<string | null> = this.socketService.error;

  public readonly currentPlayer: Signal<Player | null> = computed(() => {
    const players: Player[] = this.currentPlayers();
    const id: string | null = this.currentPlayerId();
    if (!id) return null;
    return players.find((p: Player) => p.id === id) ?? null;
  });

  public readonly isHost: Signal<boolean> = computed(() => {
    const player: Player | null = this.currentPlayer();
    return player?.isHost ?? false;
  });

  public readonly sortedPlayers: Signal<Player[]> = computed(() => {
    const players: Player[] = this.currentPlayers();
    return [...players].sort((a: Player, b: Player) => {
      if (b.score !== a.score) return b.score - a.score;
      return 0;
    });
  });

  constructor() {
    this.loadFromStorage();
    this.setupSocketListeners();
  }

  private loadFromStorage(): void {
    const gameCode: string | null = sessionStorage.getItem(STORAGE_KEY_GAME_CODE);
    const playerId: string | null = sessionStorage.getItem(STORAGE_KEY_PLAYER_ID);

    if (gameCode) {
      this.currentGameCode.set(gameCode);
    }

    if (playerId) {
      this.currentPlayerId.set(playerId);
    }
  }

  private saveToStorage(): void {
    const gameCode: string | null = this.currentGameCode();
    const playerId: string | null = this.currentPlayerId();

    if (gameCode) {
      sessionStorage.setItem(STORAGE_KEY_GAME_CODE, gameCode);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_GAME_CODE);
    }

    if (playerId) {
      sessionStorage.setItem(STORAGE_KEY_PLAYER_ID, playerId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_PLAYER_ID);
    }
  }

  private setupSocketListeners(): void {
    // Game state updates (when joining)
    effect(() => {
      const data: GameStateData | null = this.socketService.gameState();
      if (data) {
        this.currentPlayers.set(
          data.game.players.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score,
            answers: [],
            isHost: p.isHost,
          }))
        );
        this.currentState.set(data.game.state);
        this.currentQuestionIndex.set(data.game.currentQuestionIndex);
        this.totalQuestions.set(data.game.questionCount);
      }
    });

    // Player joined
    effect(() => {
      const data = this.socketService.playerJoined();
      if (data) {
        this.currentPlayers.update((players: Player[]) => {
          const exists: boolean = players.some((p: Player) => p.id === data.player.id);
          if (exists) return players;
          return [
            ...players,
            {
              id: data.player.id,
              nickname: data.player.nickname,
              score: 0,
              answers: [],
              isHost: data.player.isHost,
            },
          ];
        });
      }
    });

    // Player left
    effect(() => {
      const data = this.socketService.playerLeft();
      if (data) {
        this.currentPlayers.update((players: Player[]) =>
          players.filter((p: Player) => p.id !== data.playerId)
        );
      }
    });

    // Game started
    effect(() => {
      const data: GameStartedData | null = this.socketService.gameStarted();
      if (data) {
        this.currentState.set('in-progress');
        this.currentQuestionIndex.set(data.questionIndex);
        this.totalQuestions.set(data.totalQuestions);
        this.currentQuestion.set({
          id: data.question.id,
          text: data.question.text,
          options: data.question.options,
          questionType: data.question.questionType as 'multiple-choice',
          imageUrl: data.question.imageUrl,
          correctAnswerIndex: -1, // Not revealed yet
          explanation: '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        this.lastAnswerResult.set(null);
      }
    });

    // Answer result
    effect(() => {
      const data: AnswerResultData | null = this.socketService.answerResult();
      if (data) {
        this.lastAnswerResult.set(data);
        // Update current player's score
        const playerId: string | null = this.currentPlayerId();
        if (playerId) {
          this.currentPlayers.update((players: Player[]) =>
            players.map((p: Player) =>
              p.id === playerId ? { ...p, score: data.newScore } : p
            )
          );
        }
      }
    });

    // Question changed
    effect(() => {
      const data: QuestionChangedData | null = this.socketService.questionChanged();
      if (data) {
        this.currentQuestionIndex.set(data.questionIndex);
        this.currentQuestion.set({
          id: data.question.id,
          text: data.question.text,
          options: data.question.options,
          questionType: data.question.questionType as 'multiple-choice',
          imageUrl: data.question.imageUrl,
          correctAnswerIndex: -1,
          explanation: '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        this.lastAnswerResult.set(null);
        // Update scores
        this.currentPlayers.update((players: Player[]) =>
          players.map((p: Player) => {
            const scoreData = data.scores.find((s) => s.id === p.id);
            return scoreData ? { ...p, score: scoreData.score } : p;
          })
        );
      }
    });

    // Game ended
    effect(() => {
      const data: GameEndedData | null = this.socketService.gameEnded();
      if (data) {
        this.currentState.set('completed');
        this.finalResults.set(data);
        this.currentPlayers.set(
          data.players.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score,
            answers: p.answers,
            isHost: p.isHost,
          }))
        );
      }
    });
  }

  public async createGame(hostNickname: string, questionCount: number): Promise<string> {
    const response: CreateGameResponse = await this.apiService.createGame(
      hostNickname,
      questionCount
    );

    this.currentGameCode.set(response.code);
    this.currentPlayerId.set(response.playerId);
    this.currentState.set('lobby');
    this.totalQuestions.set(questionCount);
    this.currentPlayers.set([
      {
        id: response.playerId,
        nickname: hostNickname,
        score: 0,
        answers: [],
        isHost: true,
      },
    ]);

    this.saveToStorage();

    // Connect to socket and join the game room
    this.socketService.connect();
    this.socketService.joinGame(response.code, response.playerId);

    return response.code;
  }

  public async joinGame(gameCode: string, nickname: string): Promise<boolean> {
    try {
      const response: JoinGameResponse = await this.apiService.joinGame(gameCode, nickname);

      this.currentGameCode.set(gameCode);
      this.currentPlayerId.set(response.playerId);
      this.currentState.set('lobby');

      this.saveToStorage();

      // Connect to socket and join the game room
      this.socketService.connect();
      this.socketService.joinGame(gameCode, response.playerId);

      return true;
    } catch (error) {
      console.error('Failed to join game:', error);
      return false;
    }
  }

  public startGame(): void {
    const gameCode: string | null = this.currentGameCode();
    const playerId: string | null = this.currentPlayerId();

    if (gameCode && playerId) {
      this.socketService.startGame(gameCode, playerId);
    }
  }

  public submitAnswer(questionId: string, selectedIndex: number): void {
    const gameCode: string | null = this.currentGameCode();
    const playerId: string | null = this.currentPlayerId();

    if (gameCode && playerId) {
      this.socketService.submitAnswer(gameCode, playerId, questionId, selectedIndex);
    }
  }

  public nextQuestion(): void {
    const gameCode: string | null = this.currentGameCode();
    const playerId: string | null = this.currentPlayerId();

    if (gameCode && playerId) {
      this.socketService.nextQuestion(gameCode, playerId);
    }
  }

  public endGame(): void {
    const gameCode: string | null = this.currentGameCode();
    const playerId: string | null = this.currentPlayerId();

    if (gameCode && playerId) {
      this.socketService.endGame(gameCode, playerId);
    }
  }

  public resetGame(): void {
    this.currentGameCode.set(null);
    this.currentPlayerId.set(null);
    this.currentPlayers.set([]);
    this.currentQuestion.set(null);
    this.currentQuestionIndex.set(0);
    this.totalQuestions.set(0);
    this.currentState.set('lobby');
    this.lastAnswerResult.set(null);
    this.finalResults.set(null);

    sessionStorage.removeItem(STORAGE_KEY_GAME_CODE);
    sessionStorage.removeItem(STORAGE_KEY_PLAYER_ID);

    this.socketService.disconnect();
    this.socketService.resetSignals();
  }

  public hasPlayerAnsweredCurrentQuestion(): boolean {
    return this.lastAnswerResult() !== null;
  }

  public async reconnectToGame(): Promise<boolean> {
    const gameCode: string | null = this.currentGameCode();
    const playerId: string | null = this.currentPlayerId();

    if (!gameCode || !playerId) {
      return false;
    }

    try {
      const response = await this.apiService.getGame(gameCode);

      if (!response.game) {
        this.resetGame();
        return false;
      }

      this.currentState.set(response.game.state);

      // Connect to socket
      this.socketService.connect();
      this.socketService.joinGame(gameCode, playerId);

      return true;
    } catch (error) {
      console.error('Failed to reconnect:', error);
      this.resetGame();
      return false;
    }
  }
}
