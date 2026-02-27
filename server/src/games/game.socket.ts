import { Server, Socket } from 'socket.io';

import { logger } from '../shared/logger.js';
import { GameSocketHandler, JoinGameData, SubmitAnswerData, GameActionData } from './game.socket-handler.js';

/**
 * Register all game-related socket events
 */
export function registerGameSocket(io: Server, socket: Socket): void {
  const handler: GameSocketHandler = new GameSocketHandler(io, socket);

  socket.on('join-game', async (data: JoinGameData) => {
    logger.socket('join-game', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.joinGame(data);
  });

  socket.on('start-game', async (data: GameActionData) => {
    logger.socket('start-game', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.startGame(data);
  });

  socket.on('submit-answer', async (data: SubmitAnswerData) => {
    logger.socket('submit-answer', {
      gameCode: data.gameCode,
      playerId: data.playerId,
      questionId: data.questionId,
      selectedIndex: data.selectedIndex,
    });
    await handler.submitAnswer(data);
  });

  socket.on('next-question', async (data: GameActionData) => {
    logger.socket('next-question', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.nextQuestion(data);
  });

  socket.on('end-game', async (data: GameActionData) => {
    logger.socket('end-game', { gameCode: data.gameCode, playerId: data.playerId });
    await handler.endGame(data);
  });

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
