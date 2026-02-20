import { Request, Response, NextFunction } from 'express';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader: string | undefined = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  // Simple password-based auth for MVP
  // Format: "Bearer <password>"
  const [scheme, password] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !password) {
    res.status(401).json({ error: 'Invalid authorization format' });
    return;
  }

  const adminPassword: string = process.env.ADMIN_PASSWORD || 'sinterklaas2024';

  if (password !== adminPassword) {
    res.status(403).json({ error: 'Invalid admin password' });
    return;
  }

  next();
}
