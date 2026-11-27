import cors from 'cors';
import type { Express, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import express from 'express';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Applies Helmet security headers, strict CORS allow-list + same-origin verification,
 * gzip compression, JSON body size cap, and API rate limiting.
 */
export function applySecurityMiddleware(app: Express, allowedOrigins: string[]): void {
  app.disable('x-powered-by');

  app.use(
    helmet({
      xFrameOptions: isProd ? { action: 'sameorigin' } : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: isProd ? { policy: 'same-origin' } : false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            'ws:',
            'wss:',
            'https://*.googleapis.com',
            'https://*.firebaseio.com',
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
          ],
          frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
          frameAncestors: isProd
            ? ["'self'"]
            : [
                "'self'",
                'https://aistudio.google.com',
                'https://*.aistudio.google.com',
                'https://*.google.com',
                'https://*.usercontent.goog',
              ],
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
          allowedHeaders: ['Content-Type', 'Authorization'],
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
 * Creates a general rate-limiting middleware for /api routes.
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
 * Creates a strict rate-limiting middleware for /api/plan and /api/chat (12 requests per 15 minutes).
 */
export function createAiRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many AI requests. Please wait a few minutes before generating another plan or chat.',
    },
  });
}
