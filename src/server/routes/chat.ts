import { Router } from 'express';
import { ChatRequestSchema, type ChatRequest } from '../../shared/schemas/chat.schema';
import { validateBody } from '../middleware/validate';
import { formatSafeChatError, streamGroundedChat } from '../services/chatService';

export interface ChatRouterDeps {
  geminiApiKey?: string;
  streamChat?: (req: ChatRequest, onChunk: (text: string) => void) => Promise<void>;
}

/**
 * Creates POST /api/chat route streaming grounded assistant replies over Server-Sent Events (SSE).
 */
export function createChatRouter(deps: ChatRouterDeps = {}): Router {
  const router = Router();
  const streamer =
    deps.streamChat ??
    ((body: ChatRequest, onChunk: (text: string) => void) =>
      streamGroundedChat(body.profile, body.aqi, body.messages, onChunk, {
        geminiApiKey: deps.geminiApiKey,
      }));

  router.post('/chat', validateBody(ChatRequestSchema), async (req, res) => {
    const body = req.body as ChatRequest;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    try {
      await streamer(body, (chunkText) => {
        if (!closed) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        }
      });

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
