import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface StructuredLogEntry {
  timestamp: string;
  severity: LogSeverity;
  service: 'cleanbreath';
  event: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  detail?: string;
}

/**
 * Formats a structured JSON log record compatible with Google Cloud Logging.
 * @param severity Cloud Logging severity level.
 * @param event Machine-readable event identifier.
 * @param meta Non-sensitive structured metadata.
 */
export function buildLogRecord(
  severity: LogSeverity,
  event: string,
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event'> = {},
): StructuredLogEntry {
  return {
    timestamp: new Date().toISOString(),
    severity,
    service: 'cleanbreath',
    event,
    ...meta,
  };
}

/**
 * Emits an INFO-level structured JSON log to stdout.
 */
export function logInfo(
  event: string,
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event'> = {},
): void {
  if (process.env.NODE_ENV === 'test') return;
  console.log(JSON.stringify(buildLogRecord('INFO', event, meta)));
}

/**
 * Emits a WARNING-level structured JSON log to stdout.
 */
export function logWarn(
  event: string,
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event'> = {},
): void {
  if (process.env.NODE_ENV === 'test') return;
  console.warn(JSON.stringify(buildLogRecord('WARNING', event, meta)));
}

/**
 * Emits an ERROR-level structured JSON log to stderr without exposing secrets.
 */
export function logError(
  event: string,
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event'> = {},
): void {
  if (process.env.NODE_ENV === 'test') return;
  console.error(JSON.stringify(buildLogRecord('ERROR', event, meta)));
}

/**
 * Express middleware attaching a per-request correlation ID and logging API request latency.
 */
export function createRequestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const requestId = req.header('x-request-id') || crypto.randomUUID().slice(0, 8);
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      if (!req.path.startsWith('/api')) return;
      logInfo('api_request', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });

    next();
  };
}
