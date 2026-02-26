import { Server, Socket } from 'socket.io';

import { logger } from '../shared/logger.js';
import { GameController } from './game.controller.js';
import { IPlayer, IGameSession } from './game.model.js';
import { IQuestion } from '../questions/question.model.js';

export interface JoinGameData {
  gameCode: string;
  playerId: string;
}

export interface SubmitAnswerData {
  gameCode: string;
  playerId: string;
  questionId: string;
  selectedIndex: number;
}

export interface GameActionData {
  gameCode: string;
  playerId: string;
}

export class GameSocketHandler {
  private readonly io: Server;
  private readonly socket: Socket;
  private readonly controller: GameController;

  constructor(io: Server, socket: Socket) {
    this.io = io;
    this.socket = socket;
    this.controller = new GameController();
  }

  /**
   * Handle player joining a game room
   */
  public async joinGame(data: JoinGameData): Promise<void> {
    logger.debug('GameSocketHandler.joinGame', { gameCode: data.gameCode, playerId: data.playerId });

    try {
      const { gameCode, playerId } = data;

      const player: IPlayer | null = await this.controller.updatePlayerSocketId(
        gameCode,
        playerId,
        this.socket.id
      );

      if (!player) {
        this.socket.emit('error', { message: 'Player not found in game' });
        return;
      }

      // Join the game room
      this.socket.join(gameCode);

      // Get full game state
      const gameData = await this.controller.getGameWithQuestions(gameCode);

      if (!gameData) {
        this.socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Notify other players
      this.socket.to(gameCode).emit('player-joined', {
        player: {
          id: player.id,
          nickname: player.nickname,
          isHost: player.isHost,
        },
        playerCount: gameData.game.players.length,
      });

      // Send current game state to the joining player
      this.socket.emit('game-state', {
        game: {
          code: gameData.game.code,
          state: gameData.game.state,
          players: gameData.game.players.map((p: IPlayer) => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score,
            isHost: p.isHost,
          })),
          currentQuestionIndex: gameData.game.currentQuestionIndex,
          questionCount: gameData.game.questionCount,
        },
      });

      logger.info('Player joined game room', { gameCode, playerId, nickname: player.nickname });
    } catch (error) {
      logger.error('GameSocketHandler.joinGame', error);
      this.socket.emit('error', { message: 'Failed to join game' });
    }
  }

  /**
   * Handle host starting the game
   */
  public async startGame(data: GameActionData): Promise<void> {
    logger.debug('GameSocketHandler.startGame', { gameCode: data.gameCode, playerId: data.playerId });

    try {
      const { gameCode, playerId } = data;

      const result = await this.controller.startGame(gameCode, playerId);

      // Broadcast game started to all players
      this.io.to(gameCode).emit('game-started', {
        question: {
          id: result.question._id,
          text: result.question.text,
          options: result.question.options,
          questionType: result.question.questionType,
          imageUrl: result.question.imageUrl,
        },
        questionIndex: 0,
        totalQuestions: result.game.questionCount,
      });

      logger.info('Game started via socket', { gameCode });
    } catch (error) {
      logger.error('GameSocketHandler.startGame', error);

      const message: string = error instanceof Error ? error.message : 'Failed to start game';
      this.socket.emit('error', { message });
    }
  }

  /**
   * Handle player submitting an answer
   */
  public async submitAnswer(data: SubmitAnswerData): Promise<void> {
    logger.debug('GameSocketHandler.submitAnswer', {
      gameCode: data.gameCode,
      playerId: data.playerId,
      questionId: data.questionId,
      selectedIndex: data.selectedIndex,
    });

    try {
      const { gameCode, playerId, questionId, selectedIndex } = data;

      const result = await this.controller.submitAnswer(gameCode, playerId, questionId, selectedIndex);

      // Notify the player of their result
      this.socket.emit('answer-result', {
        isCorrect: result.isCorrect,
        correctAnswerIndex: result.correctAnswerIndex,
        explanation: result.explanation,
        newScore: result.newScore,
      });

      // Get player info for broadcast
      const game: IGameSession | null = await this.controller.findGameByCode(gameCode);
      const player: IPlayer | undefined = game?.players.find((p) => p.id === playerId);

      if (player) {
        // Broadcast that player has answered (without revealing if correct)
        this.socket.to(gameCode).emit('player-answered', {
          playerId: player.id,
          nickname: player.nickname,
        });
      }

      logger.info('Answer submitted via socket', { gameCode, playerId, isCorrect: result.isCorrect });
    } catch (error) {
      logger.error('GameSocketHandler.submitAnswer', error);

      const message: string = error instanceof Error ? error.message : 'Failed to submit answer';
      this.socket.emit('error', { message });
    }
  }

  /**
   * Handle host advancing to next question
   */
  public async nextQuestion(data: GameActionData): Promise<void> {
    logger.debug('GameSocketHandler.nextQuestion', { gameCode: data.gameCode, playerId: data.playerId });

    try {
      const { gameCode, playerId } = data;

      const result = await this.controller.nextQuestion(gameCode, playerId);

      if (result.ended) {
        // Game ended
        this.io.to(gameCode).emit('game-ended', {
          players: result.game.players
            .map((p: IPlayer) => ({
              id: p.id,
              nickname: p.nickname,
              score: p.score,
              answers: p.answers,
              isHost: p.isHost,
            }))
            .sort((a, b) => b.score - a.score),
          questions: result.questions!.map((q: IQuestion) => ({
            id: q._id,
            text: q.text,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation,
          })),
        });

        logger.info('Game ended via socket', { gameCode });
      } else {
        // Next question
        this.io.to(gameCode).emit('question-changed', {
          question: {
            id: result.question!._id,
            text: result.question!.text,
            options: result.question!.options,
            questionType: result.question!.questionType,
            imageUrl: result.question!.imageUrl,
          },
          questionIndex: result.game.currentQuestionIndex,
          totalQuestions: result.game.questionCount,
          scores: result.game.players.map((p: IPlayer) => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score,
          })),
        });

        logger.info('Advanced to next question via socket', {
          gameCode,
          questionIndex: result.game.currentQuestionIndex,
        });
      }
    } catch (error) {
      logger.error('GameSocketHandler.nextQuestion', error);

      const message: string = error instanceof Error ? error.message : 'Failed to advance question';
      this.socket.emit('error', { message });
    }
  }

  /**
   * Handle host ending game early
   */
  public async endGame(data: GameActionData): Promise<void> {
    logger.debug('GameSocketHandler.endGame', { gameCode: data.gameCode, playerId: data.playerId });

    try {
      const { gameCode, playerId } = data;

      const result = await this.controller.endGame(gameCode, playerId);

      this.io.to(gameCode).emit('game-ended', {
        players: result.game.players
          .map((p: IPlayer) => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score,
            answers: p.answers,
            isHost: p.isHost,
          }))
          .sort((a, b) => b.score - a.score),
        questions: result.questions.map((q: IQuestion) => ({
          id: q._id,
          text: q.text,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
        })),
        endedEarly: true,
      });

      logger.info('Game ended early via socket', { gameCode });
    } catch (error) {
      logger.error('GameSocketHandler.endGame', error);

      const message: string = error instanceof Error ? error.message : 'Failed to end game';
      this.socket.emit('error', { message });
    }
  }

  /**
   * Handle player disconnection
   */
  public async handleDisconnect(): Promise<void> {
    logger.debug('GameSocketHandler.handleDisconnect', { socketId: this.socket.id });

    try {
      const result = await this.controller.clearPlayerSocketId(this.socket.id);

      if (result) {
        // Notify other players
        this.socket.to(result.game.code).emit('player-left', {
          playerId: result.player.id,
          nickname: result.player.nickname,
        });

        logger.info('Player disconnected from game', {
          gameCode: result.game.code,
          playerId: result.player.id,
          nickname: result.player.nickname,
        });
      }
    } catch (error) {
      logger.error('GameSocketHandler.handleDisconnect', error);
    }
  }
}
