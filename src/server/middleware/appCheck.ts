import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

const APP_CHECK_JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1/jwks';
const JWKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface JwkKey {
  kid: string;
  kty: string;
  n?: string;
  e?: string;
  alg?: string;
}

interface JwksCacheEntry {
  keys: JwkKey[];
  expiresAt: number;
}

export interface AppCheckMiddlewareOptions {
  enabled?: boolean;
  projectNumber?: string;
  fetchFn?: typeof fetch;
}

let cachedJwks: JwksCacheEntry | null = null;

function decodeBase64UrlJson<T>(segment: string): T {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
}

async function getAppCheckJwks(fetchFn: typeof fetch): Promise<JwkKey[]> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) {
    return cachedJwks.keys;
  }
  const res = await fetchFn(APP_CHECK_JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to load Firebase App Check JWKS (${res.status})`);
  }
  const payload = (await res.json()) as { keys?: JwkKey[] };
  const keys = payload.keys ?? [];
  cachedJwks = { keys, expiresAt: Date.now() + JWKS_CACHE_TTL_MS };
  return keys;
}

/**
 * Verifies a Firebase App Check RS256 JWT token against Google's public JWKS endpoint.
 */
export async function verifyAppCheckJwt(
  token: string,
  projectNumber: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, sigB64] = parts;
  if (!headerB64 || !payloadB64 || !sigB64) return false;

  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
  if (header.alg !== 'RS256' || !header.kid) return false;

  const payload = decodeBase64UrlJson<{ iss?: string; aud?: string[]; exp?: number }>(payloadB64);
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return false;

  if (projectNumber) {
    const expectedIss = `https://firebaseappcheck.googleapis.com/${projectNumber}`;
    const expectedAud = `projects/${projectNumber}`;
    if (payload.iss !== expectedIss) return false;
    if (!Array.isArray(payload.aud) || !payload.aud.includes(expectedAud)) return false;
  }

  const keys = await getAppCheckJwks(fetchFn);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return false;

  const publicKey = crypto.createPublicKey({
    key: jwk as unknown as crypto.JsonWebKey,
    format: 'jwk',
  });
  const sigBuffer = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    sigBuffer,
  );
}

/**
 * Clears the cached App Check JWKS keys (primarily for isolated unit tests).
 */
export function resetAppCheckJwksCache(): void {
  cachedJwks = null;
}

/**
 * Optional Express middleware verifying `X-Firebase-AppCheck` tokens when enabled via environment flag.
 * Remains a transparent pass-through in local development unless `FIREBASE_APP_CHECK_ENABLED=true`.
 */
export function createAppCheckMiddleware(options: AppCheckMiddlewareOptions = {}): RequestHandler {
  const enabled =
    options.enabled ?? process.env.FIREBASE_APP_CHECK_ENABLED?.trim().toLowerCase() === 'true';
  const projectNumber = (options.projectNumber ?? process.env.FIREBASE_PROJECT_NUMBER ?? '').trim();
  const fetchFn = options.fetchFn ?? fetch;

  return async (req, res, next) => {
    if (!enabled || req.path === '/health') {
      next();
      return;
    }

    const token = req.header('X-Firebase-AppCheck')?.trim();
    if (!token) {
      res.status(401).json({ error: 'Missing Firebase App Check token.' });
      return;
    }

    try {
      const valid = await verifyAppCheckJwt(token, projectNumber, fetchFn);
      if (!valid) {
        res.status(401).json({ error: 'Invalid Firebase App Check token.' });
        return;
      }
      next();
    } catch {
      res.status(401).json({ error: 'Unable to verify Firebase App Check token.' });
    }
  };
}
