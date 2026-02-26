import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader: string | undefined = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Admin auth failed: Missing authorization header');
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  // Simple password-based auth for MVP
  // Format: "Bearer <password>"
  const [scheme, password] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !password) {
    logger.warn('Admin auth failed: Invalid authorization format');
    res.status(401).json({ error: 'Invalid authorization format' });
    return;
  }

  const adminPassword: string = process.env.ADMIN_PASSWORD || 'sinterklaas2024';

  if (password !== adminPassword) {
    logger.warn('Admin auth failed: Invalid password');
    res.status(403).json({ error: 'Invalid admin password' });
    return;
  }

  next();
}
