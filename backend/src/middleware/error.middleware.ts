import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('[Error]', err.message, err.stack);
  const response: ApiResponse<null> = {
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  };
  res.status(500).json(response);
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
}
