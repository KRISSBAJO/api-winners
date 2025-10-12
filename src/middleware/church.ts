import { Request, Response, NextFunction } from 'express';

export function churchMiddleware(req: Request, res: Response, next: NextFunction) {
  const churchId = req.headers['x-church-id'];
  if (!churchId) return res.status(400).json({ message: 'Church ID missing in headers' });
  (req as any).churchId = churchId;
  next();
}
