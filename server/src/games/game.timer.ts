import { Server } from 'socket.io';

import { logger } from '../shared/logger.js';
import { GameService } from './game.service.js';

// Module-level timer map — shared across all GameSocketHandler instances
const gameTimers = new Map<string, NodeJS.Timeout>();

export function startQuestionTimer(io: Server, service: GameService, gameCode: string): void {
  clearGameTimer(gameCode);

  const timeout: NodeJS.Timeout = setTimeout(() => {
    gameTimers.delete(gameCode);
    triggerReveal(io, service, gameCode).catch((err) => {
      logger.error('triggerReveal failed in timer callback', err);
    });
  }, 20000);

  gameTimers.set(gameCode, timeout);
}

export function clearGameTimer(gameCode: string): void {
  const existing: NodeJS.Timeout | undefined = gameTimers.get(gameCode);
  if (existing) {
    clearTimeout(existing);
    gameTimers.delete(gameCode);
  }
}

export async function triggerReveal(io: Server, service: GameService, gameCode: string): Promise<void> {
  try {
    const result = await service.revealAnswers(gameCode);
    io.to(gameCode).emit('answer-reveal', result);
    logger.info('answer-reveal emitted', { gameCode });
  } catch (error) {
    logger.error('triggerReveal error', error);
  }
}
