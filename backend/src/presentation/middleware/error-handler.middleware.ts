import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  InvalidScoreError,
  UnauthorizedError,
} from '../../domain/errors';

/**
 * Maps errors to HTTP status codes. Any error that isn't explicitly handled
 * becomes a 500 — we never leak stack traces to clients, but we log them.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express requires the 4th arg for the middleware to be recognized as an error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request payload',
      details: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  if (err instanceof ValidationError || err instanceof InvalidScoreError) {
    res.status(400).json({ error: err.name, message: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: 'NotFound', message: err.message });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(409).json({ error: 'Conflict', message: err.message });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: 'Unauthorized', message: err.message });
    return;
  }

  if (err instanceof DomainError) {
    res.status(400).json({ error: err.name, message: err.message });
    return;
  }

  // Unknown errors — log fully, return a sanitized message.
  // eslint-disable-next-line no-console
  console.error('[UnhandledError]', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
}

/**
 * Wraps an async route handler so thrown errors propagate to errorHandler.
 * Express 4 doesn't auto-forward async errors; Express 5 does, but we stay
 * compatible.
 */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
