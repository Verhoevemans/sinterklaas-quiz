import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import questionsRouter from './routes/questions.js';
import gamesRouter from './routes/games.js';

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
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/admin/questions', questionsRouter);
  app.use('/api/games', gamesRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
