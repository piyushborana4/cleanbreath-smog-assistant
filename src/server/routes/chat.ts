import { Router } from 'express';
import { ChatRequestSchema, type ChatRequest } from '../../shared/schemas/chat.schema';
import type { AirQualitySnapshot, AqiQuery } from '../../shared/schemas/aqi.schema';
import { validateBody } from '../middleware/validate';
import { createAiRateLimiter } from '../middleware/security';
import { formatSafeChatError, streamGroundedChat } from '../services/chatService';
import { getLiveAirQuality } from '../services/aqiService';

export interface ChatRouterDeps {
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  streamChat?: (
    req: ChatRequest,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
  fetchAirQuality?: (query: AqiQuery) => Promise<AirQualitySnapshot>;
}

/**
 * Creates POST /api/chat route streaming grounded assistant replies over Server-Sent Events (SSE).
 * Re-fetches server AQI, wires stream cancellation on client disconnect, and filters chat history roles.
 */
export function createChatRouter(deps: ChatRouterDeps = {}): Router {
  const router = Router();
  const streamer =
    deps.streamChat ??
    ((body: ChatRequest, onChunk: (text: string) => void, signal?: AbortSignal) =>
      streamGroundedChat(body.profile, body.aqi, body.messages, onChunk, {
        geminiApiKey: deps.geminiApiKey,
        signal,
      }));
  const aqiFetcher =
    deps.fetchAirQuality ??
    ((q: AqiQuery) => getLiveAirQuality(q, { googleMapsApiKey: deps.googleMapsApiKey }));

  router.post('/chat', createAiRateLimiter(), validateBody(ChatRequestSchema), async (req, res) => {
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
        lang: body.profile.language,
      });

      const serverRequest: ChatRequest = {
        ...body,
        aqi: serverAqi,
        messages: (body.messages ?? []).filter((m) => m.role === 'user'),
      };

      await streamer(
        serverRequest,
        (chunkText) => {
          if (!closed) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
          }
        },
        controller.signal,
      );

      if (!closed) {
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
    }
  });

  return router;
}
