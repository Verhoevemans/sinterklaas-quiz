import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import { logger } from './shared/logger.js';
import questionRoutes from './questions/question.routes.js';
import gameRoutes from './games/game.routes.js';

export function createApp(): Application {
  const app: Application = express();

  // CORS configuration
  const frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:4200';
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
    })
  );

  // Body parser
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    logger.api('GET', '/health');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/admin/questions', questionRoutes);
  app.use('/api/games', gameRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    logger.warn('Route not found', { method: req.method, path: req.path });
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
