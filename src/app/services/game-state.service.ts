import { Injectable, signal, computed, effect, DestroyRef, inject } from '@angular/core';
import { GameSession, Player, PlayerAnswer } from '../models';
import { MockQuestionsService } from './mock-questions.service';

const STORAGE_KEY_GAMES = 'sinterklaas-quiz-games';
const STORAGE_KEY_PLAYER_ID = 'sinterklaas-quiz-player-id';
const STORAGE_KEY_GAME_CODE = 'sinterklaas-quiz-game-code';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private destroyRef = inject(DestroyRef);
  private mockQuestionsService = new MockQuestionsService();

  private currentGameSession = signal<GameSession | null>(null);
  private currentPlayerId = signal<string | null>(null);

  constructor() {
    this.loadFromStorage();
    this.setupStorageListener();
    this.setupPersistence();
  }

  private loadFromStorage(): void {
    const gameCode = sessionStorage.getItem(STORAGE_KEY_GAME_CODE);
    const playerId = sessionStorage.getItem(STORAGE_KEY_PLAYER_ID);

    if (gameCode) {
      const game = this.getGameFromStorage(gameCode);
      if (game) {
        this.currentGameSession.set(game);
      }
    }

    if (playerId) {
      this.currentPlayerId.set(playerId);
    }
  }

  private setupStorageListener(): void {
    const handler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY_GAMES) {
        const currentCode = sessionStorage.getItem(STORAGE_KEY_GAME_CODE);
        if (currentCode) {
          const game = this.getGameFromStorage(currentCode);
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
      const session = this.currentGameSession();
      if (session) {
        this.saveGameToStorage(session);
        sessionStorage.setItem(STORAGE_KEY_GAME_CODE, session.code);
      }
    });

    effect(() => {
      const playerId = this.currentPlayerId();
      if (playerId) {
        sessionStorage.setItem(STORAGE_KEY_PLAYER_ID, playerId);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_PLAYER_ID);
      }
    });
  }

  private getGamesFromStorage(): Record<string, GameSession> {
    const data = localStorage.getItem(STORAGE_KEY_GAMES);
    if (!data) return {};

    const parsed = JSON.parse(data);
    // Convert createdAt strings back to Date objects
    for (const code in parsed) {
      if (parsed[code].createdAt) {
        parsed[code].createdAt = new Date(parsed[code].createdAt);
      }
    }
    return parsed;
  }

  private getGameFromStorage(code: string): GameSession | null {
    const games = this.getGamesFromStorage();
    return games[code] ?? null;
  }

  private saveGameToStorage(game: GameSession): void {
    const games = this.getGamesFromStorage();
    games[game.code] = game;
    localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
  }

  private removeGameFromStorage(code: string): void {
    const games = this.getGamesFromStorage();
    delete games[code];
    localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
  }

  // Public computed signals
  gameSession = this.currentGameSession.asReadonly();
  playerId = this.currentPlayerId.asReadonly();

  currentPlayer = computed(() => {
    const session = this.currentGameSession();
    const id = this.currentPlayerId();
    if (!session || !id) return null;
    return session.players.find((p) => p.id === id) ?? null;
  });

  isHost = computed(() => {
    const player = this.currentPlayer();
    return player?.isHost ?? false;
  });

  currentQuestion = computed(() => {
    const session = this.currentGameSession();
    if (!session || session.currentQuestionIndex >= session.questions.length) return null;
    return session.questions[session.currentQuestionIndex];
  });

  players = computed(() => {
    const session = this.currentGameSession();
    return session?.players ?? [];
  });

  sortedPlayers = computed(() => {
    const players = this.players();
    return [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tiebreaker: average response time (faster is better)
      const aAvgTime = this.getAverageResponseTime(a);
      const bAvgTime = this.getAverageResponseTime(b);
      return aAvgTime - bAvgTime;
    });
  });

  createGame(hostNickname: string, questionCount: number): string {
    const gameCode = this.generateGameCode();
    const hostId = this.generatePlayerId();
    const questions = this.mockQuestionsService.getRandomQuestions(questionCount);

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

  joinGame(gameCode: string, nickname: string): boolean {
    // Look up game from localStorage (allows joining from different browser windows)
    let session = this.getGameFromStorage(gameCode);

    if (!session) {
      return false;
    }

    if (session.state !== 'lobby') {
      return false;
    }

    // Check if nickname is already taken
    if (session.players.some((p) => p.nickname === nickname)) {
      return false;
    }

    const playerId = this.generatePlayerId();
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

  startGame(): void {
    this.currentGameSession.update((game) => {
      if (!game || game.state !== 'lobby') return game;
      return {
        ...game,
        state: 'in-progress',
        currentQuestionIndex: 0,
      };
    });
  }

  submitAnswer(questionId: string, selectedIndex: number): void {
    const session = this.currentGameSession();
    const playerId = this.currentPlayerId();
    const question = this.currentQuestion();

    if (!session || !playerId || !question || question.id !== questionId) return;

    const isCorrect = selectedIndex === question.correctAnswerIndex;
    const timestamp = Date.now();

    const answer: PlayerAnswer = {
      questionId,
      selectedIndex,
      timestamp,
      isCorrect,
    };

    this.currentGameSession.update((game) => {
      if (!game) return game;

      const updatedPlayers = game.players.map((player) => {
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

  nextQuestion(): void {
    this.currentGameSession.update((game) => {
      if (!game) return game;

      const nextIndex = game.currentQuestionIndex + 1;

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

  endGame(): void {
    this.currentGameSession.update((game) => {
      if (!game) return game;
      return {
        ...game,
        state: 'completed',
      };
    });
  }

  resetGame(): void {
    const session = this.currentGameSession();
    if (session) {
      this.removeGameFromStorage(session.code);
    }
    this.currentGameSession.set(null);
    this.currentPlayerId.set(null);
    sessionStorage.removeItem(STORAGE_KEY_GAME_CODE);
    sessionStorage.removeItem(STORAGE_KEY_PLAYER_ID);
  }

  refreshFromStorage(): void {
    const gameCode = sessionStorage.getItem(STORAGE_KEY_GAME_CODE);
    if (gameCode) {
      const game = this.getGameFromStorage(gameCode);
      if (game) {
        this.currentGameSession.set(game);
      }
    }
  }

  // Helper methods
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
    const session = this.currentGameSession();
    if (!session) return Infinity;

    const totalTime = player.answers.reduce((sum, answer, index) => {
      // Calculate time from when question was shown (we'll use a simple approximation)
      // In a real app, we'd track when each question was shown
      return sum + (answer.timestamp - session.createdAt.getTime());
    }, 0);

    return totalTime / player.answers.length;
  }

  hasPlayerAnsweredCurrentQuestion(): boolean {
    const player = this.currentPlayer();
    const question = this.currentQuestion();
    if (!player || !question) return false;
    return player.answers.some((a) => a.questionId === question.id);
  }

  getPlayerAnswer(playerId: string, questionId: string): PlayerAnswer | undefined {
    const session = this.currentGameSession();
    if (!session) return undefined;
    const player = session.players.find((p) => p.id === playerId);
    return player?.answers.find((a) => a.questionId === questionId);
  }
}
