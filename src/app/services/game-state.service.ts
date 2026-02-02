import { Injectable, signal, computed, effect, DestroyRef, inject, Signal } from '@angular/core';
import { GameSession, Player, PlayerAnswer, Question } from '../models';
import { MockQuestionsService } from './mock-questions.service';

const STORAGE_KEY_GAMES: string = 'sinterklaas-quiz-games';
const STORAGE_KEY_PLAYER_ID: string = 'sinterklaas-quiz-player-id';
const STORAGE_KEY_GAME_CODE: string = 'sinterklaas-quiz-game-code';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly mockQuestionsService: MockQuestionsService = new MockQuestionsService();

  private readonly currentGameSession = signal<GameSession | null>(null);
  private readonly currentPlayerId = signal<string | null>(null);

  // Public computed signals
  public readonly gameSession: Signal<GameSession | null> = this.currentGameSession.asReadonly();
  public readonly playerId: Signal<string | null> = this.currentPlayerId.asReadonly();

  public readonly currentPlayer: Signal<Player | null> = computed(() => {
    const session: GameSession | null = this.currentGameSession();
    const id: string | null = this.currentPlayerId();
    if (!session || !id) return null;
    return session.players.find((p: Player) => p.id === id) ?? null;
  });

  public readonly isHost: Signal<boolean> = computed(() => {
    const player: Player | null = this.currentPlayer();
    return player?.isHost ?? false;
  });

  public readonly currentQuestion: Signal<Question | null> = computed(() => {
    const session: GameSession | null = this.currentGameSession();
    if (!session || session.currentQuestionIndex >= session.questions.length) return null;
    return session.questions[session.currentQuestionIndex];
  });

  public readonly players: Signal<Player[]> = computed(() => {
    const session: GameSession | null = this.currentGameSession();
    return session?.players ?? [];
  });

  public readonly sortedPlayers: Signal<Player[]> = computed(() => {
    const players: Player[] = this.players();
    return [...players].sort((a: Player, b: Player) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tiebreaker: average response time (faster is better)
      const aAvgTime: number = this.getAverageResponseTime(a);
      const bAvgTime: number = this.getAverageResponseTime(b);
      return aAvgTime - bAvgTime;
    });
  });

  constructor() {
    this.loadFromStorage();
    this.setupStorageListener();
    this.setupPersistence();
  }

  private loadFromStorage(): void {
    const gameCode: string | null = sessionStorage.getItem(STORAGE_KEY_GAME_CODE);
    const playerId: string | null = sessionStorage.getItem(STORAGE_KEY_PLAYER_ID);

    if (gameCode) {
      const game: GameSession | null = this.getGameFromStorage(gameCode);
      if (game) {
        this.currentGameSession.set(game);
      }
    }

    if (playerId) {
      this.currentPlayerId.set(playerId);
    }
  }

  private setupStorageListener(): void {
    const handler = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEY_GAMES) {
        const currentCode: string | null = sessionStorage.getItem(STORAGE_KEY_GAME_CODE);
        if (currentCode) {
          const game: GameSession | null = this.getGameFromStorage(currentCode);
          if (game) {
            this.currentGameSession.set(game);
          }
        }
      }
    };

    window.addEventListener('storage', handler);
    this.destroyRef.onDestroy(() => window.removeEventListener('storage', handler));
  }

  private setupPersistence(): void {
    effect(() => {
      const session: GameSession | null = this.currentGameSession();
      if (session) {
        this.saveGameToStorage(session);
        sessionStorage.setItem(STORAGE_KEY_GAME_CODE, session.code);
      }
    });

    effect(() => {
      const playerId: string | null = this.currentPlayerId();
      if (playerId) {
        sessionStorage.setItem(STORAGE_KEY_PLAYER_ID, playerId);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_PLAYER_ID);
      }
    });
  }

  private getGamesFromStorage(): Record<string, GameSession> {
    const data: string | null = localStorage.getItem(STORAGE_KEY_GAMES);
    if (!data) return {};

    const parsed: Record<string, GameSession> = JSON.parse(data);
    // Convert createdAt strings back to Date objects
    for (const code in parsed) {
      if (parsed[code].createdAt) {
        parsed[code].createdAt = new Date(parsed[code].createdAt);
      }
    }
    return parsed;
  }

  private getGameFromStorage(code: string): GameSession | null {
    const games: Record<string, GameSession> = this.getGamesFromStorage();
    return games[code] ?? null;
  }

  private saveGameToStorage(game: GameSession): void {
    const games: Record<string, GameSession> = this.getGamesFromStorage();
    games[game.code] = game;
    localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
  }

  private removeGameFromStorage(code: string): void {
    const games: Record<string, GameSession> = this.getGamesFromStorage();
    delete games[code];
    localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
  }

  public createGame(hostNickname: string, questionCount: number): string {
    const gameCode: string = this.generateGameCode();
    const hostId: string = this.generatePlayerId();
    const questions: Question[] = this.mockQuestionsService.getRandomQuestions(questionCount);

    const host: Player = {
      id: hostId,
      nickname: hostNickname,
      score: 0,
      answers: [],
      isHost: true,
    };

    const newGame: GameSession = {
      id: this.generateGameId(),
      code: gameCode,
      hostId: hostId,
      players: [host],
      questionCount: questionCount,
      currentQuestionIndex: 0,
      questions: questions,
      state: 'lobby',
      createdAt: new Date(),
    };

    this.currentGameSession.set(newGame);
    this.currentPlayerId.set(hostId);

    return gameCode;
  }

  public joinGame(gameCode: string, nickname: string): boolean {
    // Look up game from localStorage (allows joining from different browser windows)
    let session: GameSession | null = this.getGameFromStorage(gameCode);

    if (!session) {
      return false;
    }

    if (session.state !== 'lobby') {
      return false;
    }

    // Check if nickname is already taken
    if (session.players.some((p: Player) => p.nickname === nickname)) {
      return false;
    }

    const playerId: string = this.generatePlayerId();
    const newPlayer: Player = {
      id: playerId,
      nickname: nickname,
      score: 0,
      answers: [],
      isHost: false,
    };

    // Update the session with new player
    session = {
      ...session,
      players: [...session.players, newPlayer],
    };

    this.currentGameSession.set(session);
    this.currentPlayerId.set(playerId);
    return true;
  }

  public startGame(): void {
    this.currentGameSession.update((game: GameSession | null) => {
      if (!game || game.state !== 'lobby') return game;
      return {
        ...game,
        state: 'in-progress',
        currentQuestionIndex: 0,
      };
    });
  }

  public submitAnswer(questionId: string, selectedIndex: number): void {
    const session: GameSession | null = this.currentGameSession();
    const playerId: string | null = this.currentPlayerId();
    const question: Question | null = this.currentQuestion();

    if (!session || !playerId || !question || question.id !== questionId) return;

    const isCorrect: boolean = selectedIndex === question.correctAnswerIndex;
    const timestamp: number = Date.now();

    const answer: PlayerAnswer = {
      questionId,
      selectedIndex,
      timestamp,
      isCorrect,
    };

    this.currentGameSession.update((game: GameSession | null) => {
      if (!game) return game;

      const updatedPlayers: Player[] = game.players.map((player: Player) => {
        if (player.id !== playerId) return player;

        return {
          ...player,
          answers: [...player.answers, answer],
          score: player.score + (isCorrect ? 100 : 0),
        };
      });

      return {
        ...game,
        players: updatedPlayers,
      };
    });
  }

  public nextQuestion(): void {
    this.currentGameSession.update((game: GameSession | null) => {
      if (!game) return game;

      const nextIndex: number = game.currentQuestionIndex + 1;

      if (nextIndex >= game.questions.length) {
        return {
          ...game,
          state: 'completed',
        };
      }

      return {
        ...game,
        currentQuestionIndex: nextIndex,
      };
    });
  }

  public endGame(): void {
    this.currentGameSession.update((game: GameSession | null) => {
      if (!game) return game;
      return {
        ...game,
        state: 'completed',
      };
    });
  }

  public resetGame(): void {
    const session: GameSession | null = this.currentGameSession();
    if (session) {
      this.removeGameFromStorage(session.code);
    }
    this.currentGameSession.set(null);
    this.currentPlayerId.set(null);
    sessionStorage.removeItem(STORAGE_KEY_GAME_CODE);
    sessionStorage.removeItem(STORAGE_KEY_PLAYER_ID);
  }

  public refreshFromStorage(): void {
    const gameCode: string | null = sessionStorage.getItem(STORAGE_KEY_GAME_CODE);
    if (gameCode) {
      const game: GameSession | null = this.getGameFromStorage(gameCode);
      if (game) {
        this.currentGameSession.set(game);
      }
    }
  }

  private generateGameCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getAverageResponseTime(player: Player): number {
    if (player.answers.length === 0) return Infinity;
    const session: GameSession | null = this.currentGameSession();
    if (!session) return Infinity;

    const totalTime: number = player.answers.reduce(
      (sum: number, answer: PlayerAnswer) => {
        // Calculate time from when question was shown (we'll use a simple approximation)
        // In a real app, we'd track when each question was shown
        return sum + (answer.timestamp - session.createdAt.getTime());
      },
      0
    );

    return totalTime / player.answers.length;
  }

  public hasPlayerAnsweredCurrentQuestion(): boolean {
    const player: Player | null = this.currentPlayer();
    const question: Question | null = this.currentQuestion();
    if (!player || !question) return false;
    return player.answers.some((a: PlayerAnswer) => a.questionId === question.id);
  }

  public getPlayerAnswer(playerId: string, questionId: string): PlayerAnswer | undefined {
    const session: GameSession | null = this.currentGameSession();
    if (!session) return undefined;
    const player: Player | undefined = session.players.find((p: Player) => p.id === playerId);
    return player?.answers.find((a: PlayerAnswer) => a.questionId === questionId);
  }
}
