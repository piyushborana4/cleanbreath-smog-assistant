// @vitest-environment node
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAppCheckMiddleware,
  resetAppCheckJwksCache,
  verifyAppCheckJwt,
} from '../../src/server/middleware/appCheck';
import { GEMINI_FLASH_MODEL, getGeminiClient } from '../../src/server/services/geminiClient';
import {
  buildLogRecord,
  createRequestLogger,
  formatCloudTrace,
} from '../../src/server/utils/logger';

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

describe('geminiClient, Cloud Logging logger, and Firebase App Check middleware', () => {
  afterEach(() => {
    resetAppCheckJwksCache();
    vi.restoreAllMocks();
  });

  it('creates Gemini client for API key vs Vertex AI and returns null when unconfigured', () => {
    expect(GEMINI_FLASH_MODEL).toBe('gemini-4-hydrogen');
    expect(getGeminiClient(undefined, { useVertexAi: false })).toBeNull();
    expect(getGeminiClient('MY_GEMINI_API_KEY', { useVertexAi: false })).toBeNull();

    const apiKeyClient = getGeminiClient('real-test-api-key', { useVertexAi: false });
    expect(apiKeyClient).not.toBeNull();
    // Singleton cache hit for same API key
    expect(getGeminiClient('real-test-api-key', { useVertexAi: false })).toBe(apiKeyClient);

    expect(getGeminiClient(undefined, { useVertexAi: true, project: '' })).toBeNull();
    const vertexClient = getGeminiClient(undefined, {
      useVertexAi: true,
      project: 'cleanbreath-prod',
      location: 'asia-south1',
    });
    expect(vertexClient).not.toBeNull();
    expect(
      getGeminiClient(undefined, {
        useVertexAi: true,
        project: 'cleanbreath-prod',
        location: 'asia-south1',
      }),
    ).toBe(vertexClient);
  });

  it('formats Cloud Trace headers and emits Cloud Logging httpRequest metadata', () => {
    expect(formatCloudTrace(undefined, 'cleanbreath-prod')).toBeUndefined();
    expect(formatCloudTrace('not-hex', 'cleanbreath-prod')).toBeUndefined();
    expect(formatCloudTrace('105445aa7843bc8bf206b12000100000/1;o=1', 'cleanbreath-prod')).toBe(
      'projects/cleanbreath-prod/traces/105445aa7843bc8bf206b12000100000',
    );
    expect(formatCloudTrace('105445aa7843bc8bf206b12000100000/1;o=1', '')).toBe(
      '105445aa7843bc8bf206b12000100000',
    );

    const record = buildLogRecord('WARNING', 'rate_limit', { statusCode: 429 });
    expect(record.severity).toBe('WARNING');
    expect(record.message).toBe('rate_limit');

    let finishHandler: (() => void) | undefined;
    const setHeader = vi.fn();
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const middleware = createRequestLogger();
      middleware(
        {
          method: 'GET',
          path: '/api/aqi',
          originalUrl: '/api/aqi?city=Delhi',
          ip: '127.0.0.1',
          header: (name: string) =>
            name.toLowerCase() === 'x-cloud-trace-context'
              ? '105445aa7843bc8bf206b12000100000/1;o=1'
              : undefined,
        } as unknown as Request,
        {
          statusCode: 200,
          setHeader,
          on: (event: string, cb: () => void) => {
            if (event === 'finish') finishHandler = cb;
          },
        } as unknown as Response,
        vi.fn() as unknown as NextFunction,
      );

      expect(setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
      finishHandler?.();
      expect(logSpy).toHaveBeenCalledTimes(1);
      const emitted = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
        severity: string;
        httpRequest: { requestMethod: string; status: number };
        'logging.googleapis.com/trace'?: string;
      };
      expect(emitted.severity).toBe('INFO');
      expect(emitted.httpRequest.requestMethod).toBe('GET');
      expect(emitted.httpRequest.status).toBe(200);
      expect(emitted['logging.googleapis.com/trace']).toContain('105445aa7843bc8bf206b12000100000');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('verifies Firebase App Check RS256 JWTs against JWKS and rejects missing, expired, or forged tokens', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' }) as Record<string, string>;
    jwk.kid = 'test-kid-1';
    jwk.alg = 'RS256';

    const mockFetch = vi.fn(
      async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const signJwt = (payloadObj: Record<string, unknown>, kid = 'test-kid-1') => {
      const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }));
      const payload = toBase64Url(JSON.stringify(payloadObj));
      const signature = toBase64Url(
        crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey),
      );
      return `${header}.${payload}.${signature}`;
    };

    const validJwt = signJwt({
      iss: 'https://firebaseappcheck.googleapis.com/123456789',
      aud: ['projects/123456789'],
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    expect(await verifyAppCheckJwt(validJwt, '123456789', mockFetch)).toBe(true);

    const expiredJwt = signJwt({
      iss: 'https://firebaseappcheck.googleapis.com/123456789',
      aud: ['projects/123456789'],
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    expect(await verifyAppCheckJwt(expiredJwt, '123456789', mockFetch)).toBe(false);

    const wrongAudienceJwt = signJwt({
      iss: 'https://firebaseappcheck.googleapis.com/123456789',
      aud: ['projects/999999'],
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    expect(await verifyAppCheckJwt(wrongAudienceJwt, '123456789', mockFetch)).toBe(false);
    expect(await verifyAppCheckJwt('malformed-token', '123456789', mockFetch)).toBe(false);

    const mw = createAppCheckMiddleware({
      enabled: true,
      projectNumber: '123456789',
      fetchFn: mockFetch,
    });
    const statusFn = vi.fn().mockReturnThis();
    const jsonFn = vi.fn();
    const nextFn = vi.fn();

    await mw(
      { path: '/plan', header: () => undefined } as unknown as Request,
      { status: statusFn, json: jsonFn } as unknown as Response,
      nextFn as unknown as NextFunction,
    );
    expect(statusFn).toHaveBeenCalledWith(401);
    expect(nextFn).not.toHaveBeenCalled();

    await mw(
      { path: '/plan', header: () => validJwt } as unknown as Request,
      { status: statusFn, json: jsonFn } as unknown as Response,
      nextFn as unknown as NextFunction,
    );
    expect(nextFn).toHaveBeenCalledTimes(1);
  });
});
