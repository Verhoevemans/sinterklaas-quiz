import { Server, Socket } from 'socket.io';
import { GameSocketHandler, JoinGameData, SubmitAnswerData, GameActionData } from './game.socket-handler.js';
import { logger } from '../shared/logger.js';

/**
 * Register all game-related socket events
 */
export function registerGameSocket(io: Server, socket: Socket): void {
  const handler: GameSocketHandler = new GameSocketHandler(io, socket);

  // Join a game room
  socket.on('join-game', async (data: JoinGameData) => {
    logger.socket('join-game', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.joinGame(data);
  });

  // Host starts the game
  socket.on('start-game', async (data: GameActionData) => {
    logger.socket('start-game', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.startGame(data);
  });

  // Player submits an answer
  socket.on('submit-answer', async (data: SubmitAnswerData) => {
    logger.socket('submit-answer', {
      gameCode: data.gameCode,
      playerId: data.playerId,
      questionId: data.questionId,
      selectedIndex: data.selectedIndex,
    });
    await handler.submitAnswer(data);
  });

  // Host advances to next question
  socket.on('next-question', async (data: GameActionData) => {
    logger.socket('next-question', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.nextQuestion(data);
  });

  // Host ends game early
  socket.on('end-game', async (data: GameActionData) => {
    logger.socket('end-game', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.endGame(data);
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    logger.socket('disconnect', { socketId: socket.id });
    await handler.handleDisconnect();
  });
}

/**
 * Setup game socket handlers for all connections
 */
export function setupGameSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.socket('connection', { socketId: socket.id });
    registerGameSocket(io, socket);
  });
}
