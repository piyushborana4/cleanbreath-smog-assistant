import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { logError } from '../utils/logger';

/**
 * Validates `req.body` against a Zod schema and forwards sanitized data or 400 error.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

/**
 * Global Express error handler that logs structured metadata and strips internal stack traces.
 */
export function apiErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const errObj = err as { status?: number; statusCode?: number; type?: string; message?: string };
  const message = err instanceof Error ? err.message : 'Internal server error';
  const rawStatus = errObj?.status ?? errObj?.statusCode;
  const status = message.includes('CORS')
    ? 403
    : rawStatus === 413 || errObj?.type === 'entity.too.large'
      ? 413
      : rawStatus === 400 || errObj?.type === 'entity.parse.failed'
        ? 400
        : 500;

  logError('api_unhandled_error', {
    method: req.method,
    path: req.path,
    statusCode: status,
    detail: message.slice(0, 180),
  });

  const errorText =
    status === 403
      ? 'CORS origin forbidden'
      : status === 413
        ? 'Request payload exceeds 64kb limit'
        : status === 400
          ? 'Malformed JSON request body'
          : 'An unexpected server error occurred';

  res.status(status).json({ error: errorText });
}
