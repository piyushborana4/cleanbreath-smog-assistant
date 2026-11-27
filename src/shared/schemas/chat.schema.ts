import { z } from 'zod';
import { HouseholdProfileSchema } from './profile.schema';
import { AirQualitySnapshotSchema } from './aqi.schema';

/**
 * Single message turn in the grounded CleanBreath assistant conversation.
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().trim().min(1).max(600),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Request body schema for POST /api/chat (SSE streaming).
 */
export const ChatRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  aqi: AirQualitySnapshotSchema,
  messages: z.array(ChatMessageSchema).min(1).max(12),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Typed SSE event emitted by POST /api/chat.
 */
export const ChatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('chunk'), text: z.string() }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
