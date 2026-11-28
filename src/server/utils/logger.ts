import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface CloudLoggingHttpRequest {
  requestMethod: string;
  requestUrl: string;
  status: number;
  latency: string;
  remoteIp?: string;
  userAgent?: string;
}

export interface StructuredLogEntry {
  timestamp: string;
  severity: LogSeverity;
  message: string;
  service: 'cleanbreath';
  event: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  detail?: string;
  httpRequest?: CloudLoggingHttpRequest;
  'logging.googleapis.com/trace'?: string;
}

/**
 * Extracts the Cloud Trace identifier from an incoming `X-Cloud-Trace-Context` header
 * formatted as `TRACE_ID/SPAN_ID;o=TRACE_TRUE`.
 */
export function formatCloudTrace(
  traceHeader: string | undefined,
  projectId = process.env.GOOGLE_CLOUD_PROJECT,
): string | undefined {
  if (!traceHeader) return undefined;
  const traceId = traceHeader.split('/')[0]?.trim();
  if (!traceId || !/^[a-fA-F0-9]{16,64}$/.test(traceId)) {
    return undefined;
  }
  return projectId ? `projects/${projectId}/traces/${traceId}` : traceId;
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
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event' | 'message'> & {
    message?: string;
  } = {},
): StructuredLogEntry {
  const { message, ...rest } = meta;
  return {
    timestamp: new Date().toISOString(),
    severity,
    message: message || (rest.detail ? `${event}: ${rest.detail}` : event),
    service: 'cleanbreath',
    event,
    ...rest,
  };
}

/**
 * Emits an INFO-level structured JSON log to stdout.
 */
export function logInfo(
  event: string,
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event' | 'message'> & {
    message?: string;
  } = {},
): void {
  if (process.env.NODE_ENV === 'test') return;
  console.log(JSON.stringify(buildLogRecord('INFO', event, meta)));
}

/**
 * Emits a WARNING-level structured JSON log to stdout.
 */
export function logWarn(
  event: string,
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event' | 'message'> & {
    message?: string;
  } = {},
): void {
  if (process.env.NODE_ENV === 'test') return;
  console.warn(JSON.stringify(buildLogRecord('WARNING', event, meta)));
}

/**
 * Emits an ERROR-level structured JSON log to stderr without exposing secrets.
 */
export function logError(
  event: string,
  meta: Omit<StructuredLogEntry, 'timestamp' | 'severity' | 'service' | 'event' | 'message'> & {
    message?: string;
  } = {},
): void {
  if (process.env.NODE_ENV === 'test') return;
  console.error(JSON.stringify(buildLogRecord('ERROR', event, meta)));
}

/**
 * Express middleware attaching a per-request correlation ID and emitting Cloud Logging JSON fields.
 */
export function createRequestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const requestId = req.header('x-request-id') || crypto.randomUUID().slice(0, 8);
    const trace = formatCloudTrace(req.header('x-cloud-trace-context'));
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      if (!req.path.startsWith('/api')) return;
      const durationMs = Date.now() - start;
      logInfo('api_request', {
        message: `${req.method} ${req.path} ${res.statusCode} (${durationMs}ms)`,
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        ...(trace ? { 'logging.googleapis.com/trace': trace } : {}),
        httpRequest: {
          requestMethod: req.method,
          requestUrl: req.originalUrl || req.path,
          status: res.statusCode,
          latency: `${(durationMs / 1000).toFixed(3)}s`,
          remoteIp: req.ip,
          userAgent: req.header('user-agent'),
        },
      });
    });

    next();
  };
}
