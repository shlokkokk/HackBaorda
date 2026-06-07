// ═══════════════════════════════════════════════════════════
// Global Error Handler
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    const response: ApiError = {
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      requestId: req.requestId,
    };
    res.status(400).json(response);
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    const response: ApiError = {
      error: err.name,
      message: err.message,
      details: err.details,
      requestId: req.requestId,
    };

    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.requestId }, err.message);
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown errors
  logger.error({ err, requestId: req.requestId }, 'Unhandled error');

  const response: ApiError = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    requestId: req.requestId,
  };

  res.status(500).json(response);
}
