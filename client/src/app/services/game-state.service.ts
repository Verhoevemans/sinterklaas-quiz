import { Injectable, signal, computed, effect, inject, Signal } from '@angular/core';
import { GameSession, Player, PlayerAnswer, Question } from '../models';
import { ApiService, CreateGameResponse, JoinGameResponse } from './api.service';
import {
  SocketService,
  GameStateData,
  GameStartedData,
  QuestionChangedData,
  AnswerRevealData,
  GameEndedData,
  PlayerAnsweredData,
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
  private readonly lastAnswerResult = signal<AnswerRevealData | null>(null);
  private readonly finalResults = signal<GameEndedData | null>(null);
  private readonly questionStartTime = signal<number | null>(null);
  private readonly hasSubmitted = signal<boolean>(false);
  private readonly answeredPlayerIds = signal<string[]>([]);

  // Public computed signals
  public readonly gameCode: Signal<string | null> = this.currentGameCode.asReadonly();
  public readonly playerId: Signal<string | null> = this.currentPlayerId.asReadonly();
  public readonly players: Signal<Player[]> = this.currentPlayers.asReadonly();
  public readonly question: Signal<Question | null> = this.currentQuestion.asReadonly();
  public readonly questionIndex: Signal<number> = this.currentQuestionIndex.asReadonly();
  public readonly questionCount: Signal<number> = this.totalQuestions.asReadonly();
  public readonly state: Signal<'lobby' | 'in-progress' | 'completed'> =
    this.currentState.asReadonly();
  public readonly answerResult: Signal<AnswerRevealData | null> = this.lastAnswerResult.asReadonly();
  public readonly results: Signal<GameEndedData | null> = this.finalResults.asReadonly();
  public readonly socketConnected: Signal<boolean> = this.socketService.connected;
  public readonly socketError: Signal<string | null> = this.socketService.error;
  public readonly questionStartTimeValue: Signal<number | null> = this.questionStartTime.asReadonly();

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

  public readonly answeredCount: Signal<number> = computed(() => this.answeredPlayerIds().length);

  public readonly nonHostPlayerCount: Signal<number> = computed(() =>
    this.currentPlayers().filter((p: Player) => !p.isHost).length
  );

  public readonly nonHostSortedPlayers: Signal<Player[]> = computed(() =>
    [...this.currentPlayers()]
      .filter((p: Player) => !p.isHost)
      .sort((a: Player, b: Player) => (b.score !== a.score ? b.score - a.score : 0))
  );

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
        this.questionStartTime.set(data.startTime);
        this.hasSubmitted.set(false);
        this.lastAnswerResult.set(null);
        this.answeredPlayerIds.set([]);
      }
    });

    // Answer submitted ack — just track that this player has submitted
    effect(() => {
      const data = this.socketService.answerResult();
      if (data) {
        this.hasSubmitted.set(true);
      }
    });

    // Player answered — track for host answered-count display
    effect(() => {
      const data: PlayerAnsweredData | null = this.socketService.playerAnswered();
      if (data) {
        this.answeredPlayerIds.update((ids: string[]) =>
          ids.includes(data.playerId) ? ids : [...ids, data.playerId]
        );
      }
    });

    // Answer reveal — broadcast to all players simultaneously
    effect(() => {
      const data: AnswerRevealData | null = this.socketService.answerReveal();
      if (data) {
        this.lastAnswerResult.set(data);
        // Update player scores from reveal data
        this.currentPlayers.update((players: Player[]) =>
          players.map((p: Player) => {
            const scoreData = data.scores.find((s) => s.id === p.id);
            return scoreData ? { ...p, score: scoreData.score } : p;
          })
        );
        // null signals reveal is done — stop countdown
        this.questionStartTime.set(null);
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
        this.questionStartTime.set(data.startTime);
        this.hasSubmitted.set(false);
        this.lastAnswerResult.set(null);
        this.answeredPlayerIds.set([]);
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
    this.questionStartTime.set(null);
    this.hasSubmitted.set(false);
    this.answeredPlayerIds.set([]);

    sessionStorage.removeItem(STORAGE_KEY_GAME_CODE);
    sessionStorage.removeItem(STORAGE_KEY_PLAYER_ID);

    this.socketService.disconnect();
    this.socketService.resetSignals();
  }

  public hasPlayerAnsweredCurrentQuestion(): boolean {
    return this.hasSubmitted();
  }

  public getSelectedIndexForCurrentQuestion(): number | null {
    const player: Player | null = this.currentPlayer();
    const question = this.currentQuestion();
    if (!player || !question) return null;
    return player.answers.find((a) => a.questionId === question.id)?.selectedIndex ?? null;
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

      // Restore full game state from the API response
      this.currentState.set(response.game.state);
      this.totalQuestions.set(response.game.questionCount);
      this.currentQuestionIndex.set(response.game.currentQuestionIndex);
      this.currentPlayers.set(response.game.players);

      if (response.game.state === 'in-progress' && response.currentQuestion) {
        this.currentQuestion.set(response.currentQuestion);

        const player = response.game.players.find((p: Player) => p.id === this.currentPlayerId());
        const existingAnswer = player?.answers.find(
          (a: PlayerAnswer) => a.questionId === response.currentQuestion!.id
        );

        if (existingAnswer) {
          // Player already answered this question
          this.hasSubmitted.set(true);
        }

        const startTime: number | null = response.game.questionStartTime ?? null;

        if (startTime === null) {
          // Reveal has already happened — reconstruct reveal state
          this.questionStartTime.set(null);
          if (response.currentQuestion.correctAnswerIndex >= 0) {
            this.lastAnswerResult.set({
              correctAnswerIndex: response.currentQuestion.correctAnswerIndex,
              explanation: response.currentQuestion.explanation,
              scores: response.game.players.map((p: Player) => ({
                id: p.id,
                nickname: p.nickname,
                score: p.score,
              })),
            });
          }
        } else {
          this.questionStartTime.set(startTime);
        }
      }

      // Reconnect to socket and rejoin the game room
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
