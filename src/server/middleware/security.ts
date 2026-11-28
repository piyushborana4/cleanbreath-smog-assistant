import compression from 'compression';
import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export interface SecurityMiddlewareOptions {
  isProduction?: boolean;
  allowEmbedding?: boolean;
}

/**
 * Applies Helmet security headers, strict CORS allow-list + same-origin verification,
 * gzip compression, JSON body size cap, and API rate limiting.
 * Enforces strict CSP (no script 'unsafe-inline', no ws:/wss: wildcards, frame-ancestors 'self',
 * X-Frame-Options: DENY, Cross-Origin-Resource-Policy: same-origin) in production unless
 * ALLOW_EMBEDDING=true is explicitly set for preview frames.
 */
export function applySecurityMiddleware(
  app: Express,
  allowedOrigins: string[],
  options: SecurityMiddlewareOptions = {},
): void {
  app.disable('x-powered-by');

  const isProd = options.isProduction ?? process.env.NODE_ENV === 'production';
  const allowEmbedding =
    options.allowEmbedding ??
    (process.env.ALLOW_EMBEDDING?.trim() !== ''
      ? process.env.ALLOW_EMBEDDING?.trim().toLowerCase() === 'true'
      : !isProd);

  const strictProd = isProd && !allowEmbedding;

  app.use(
    helmet({
      xFrameOptions: strictProd ? { action: 'deny' } : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: strictProd ? { policy: 'same-origin' } : false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: strictProd
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: strictProd
            ? [
                "'self'",
                'https://*.googleapis.com',
                'https://*.firebaseio.com',
                'https://identitytoolkit.googleapis.com',
                'https://securetoken.googleapis.com',
                'https://firebaseappcheck.googleapis.com',
              ]
            : [
                "'self'",
                'ws:',
                'wss:',
                'https://*.googleapis.com',
                'https://*.firebaseio.com',
                'https://identitytoolkit.googleapis.com',
                'https://securetoken.googleapis.com',
                'https://firebaseappcheck.googleapis.com',
              ],
          frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
          frameAncestors: strictProd
            ? ["'self'"]
            : [
                "'self'",
                'https://aistudio.google.com',
                'https://*.aistudio.google.com',
                'https://*.google.com',
                'https://*.usercontent.goog',
              ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );

  app.use(
    cors((req, callback) => {
      const origin = req.header('Origin');
      if (!origin) {
        return callback(null, { origin: true });
      }
      const normalized = origin.replace(/\/+$/, '');
      const rawHost = req.header('x-forwarded-host') || req.header('host') || '';
      const host = rawHost.split(',')[0]?.trim();
      const isSameHost = Boolean(
        host && (normalized === `https://${host}` || normalized === `http://${host}`),
      );

      if (allowedOrigins.includes(normalized) || isSameHost) {
        return callback(null, {
          origin: true,
          methods: ['GET', 'POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Firebase-AppCheck'],
          maxAge: 600,
        });
      }

      return callback(new Error('Origin not allowed by CORS policy'));
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '64kb' }));
}

/**
 * Creates a general rate-limiting middleware for non-AI /api routes.
 */
export function createApiRateLimiter(maxRequests = 90): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this client. Please wait a few minutes and try again.',
    },
  });
}

/**
 * Creates a strict rate-limiting middleware for Gemini AI endpoints
 * (/api/plan, /api/chat, /api/community/checklist).
 */
export function createAiRateLimiter(maxRequests = 12): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many AI requests. Please wait a few minutes before trying again.',
    },
  });
}
