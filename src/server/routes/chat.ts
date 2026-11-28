import { Router } from 'express';
import { ChatRequestSchema, type ChatRequest } from '../../shared/schemas/chat.schema';
import type { AirQualitySnapshot, AqiQuery } from '../../shared/schemas/aqi.schema';
import { validateBody } from '../middleware/validate';
import { createAiRateLimiter } from '../middleware/security';
import { formatSafeChatError, streamGroundedChat } from '../services/chatService';
import { getLiveAirQuality } from '../services/aqiService';
import type { GeminiClientOptions } from '../services/geminiClient';

export interface ChatRouterDeps {
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  aiRateLimitMax?: number;
  streamTimeoutMs?: number;
  maxConcurrentPerIp?: number;
  geminiOptions?: GeminiClientOptions;
  streamChat?: (
    req: ChatRequest & { aqi: AirQualitySnapshot },
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
  fetchAirQuality?: (query: AqiQuery) => Promise<AirQualitySnapshot>;
}

/**
 * Creates POST /api/chat route streaming grounded assistant replies over Server-Sent Events (SSE).
 * Re-fetches server AQI, enforces per-IP concurrency and strict AI rate limiting, cancels upstream
 * Gemini generation on client disconnect or timeout, and drops client-supplied model turns.
 */
export function createChatRouter(deps: ChatRouterDeps = {}): Router {
  const router = Router();
  const activeStreamsByIp = new Map<string, number>();
  const maxConcurrent = deps.maxConcurrentPerIp ?? 2;

  const streamer =
    deps.streamChat ??
    ((
      body: ChatRequest & { aqi: AirQualitySnapshot },
      onChunk: (text: string) => void,
      signal?: AbortSignal,
    ) =>
      streamGroundedChat(body.profile, body.aqi, body.messages, onChunk, {
        geminiApiKey: deps.geminiApiKey,
        signal,
        timeoutMs: deps.streamTimeoutMs,
        geminiOptions: deps.geminiOptions,
      }));
  const aqiFetcher =
    deps.fetchAirQuality ??
    ((q: AqiQuery) => getLiveAirQuality(q, { googleMapsApiKey: deps.googleMapsApiKey }));

  router.post(
    '/chat',
    createAiRateLimiter(deps.aiRateLimitMax ?? 12),
    validateBody(ChatRequestSchema),
    async (req, res) => {
      const clientIp = req.ip || 'unknown';
      const activeCount = activeStreamsByIp.get(clientIp) ?? 0;
      if (activeCount >= maxConcurrent) {
        res.status(429).json({
          error:
            'Too many active chat streams from this client. Please wait for the current reply.',
        });
        return;
      }
      activeStreamsByIp.set(clientIp, activeCount + 1);

      const body = req.body as ChatRequest;

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const controller = new AbortController();
      let closed = false;
      req.on('close', () => {
        closed = true;
        controller.abort();
      });

      try {
        const serverAqi = await aqiFetcher({
          city: body.profile.location.city,
          locality: body.profile.location.locality,
          lat: body.profile.location.lat,
          lng: body.profile.location.lng,
          lang: body.profile.language,
        });

        const serverRequest: ChatRequest & { aqi: AirQualitySnapshot } = {
          ...body,
          aqi: serverAqi,
          messages: (body.messages ?? []).filter((m) => m.role === 'user'),
        };

        await streamer(
          serverRequest,
          (chunkText) => {
            if (!closed && !controller.signal.aborted) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
            }
          },
          controller.signal,
        );

        if (!closed && !controller.signal.aborted) {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
        }
      } catch (err) {
        if (!closed) {
          res.write(
            `data: ${JSON.stringify({ type: 'error', message: formatSafeChatError(err) })}\n\n`,
          );
          res.end();
        }
      } finally {
        const remaining = (activeStreamsByIp.get(clientIp) ?? 1) - 1;
        if (remaining <= 0) {
          activeStreamsByIp.delete(clientIp);
        } else {
          activeStreamsByIp.set(clientIp, remaining);
        }
      }
    },
  );

  return router;
}
