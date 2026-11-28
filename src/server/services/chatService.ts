import { ThinkingLevel, type GoogleGenAI } from '@google/genai';
import type { AirQualitySnapshot } from '../../shared/schemas/aqi.schema';
import type { ChatMessage } from '../../shared/schemas/chat.schema';
import type { HouseholdProfile } from '../../shared/schemas/profile.schema';
import { buildGroundedChatContents } from '../prompts/chatPrompt';
import { buildChatSystemInstruction } from '../prompts/systemInstructions';
import { hasPromptInjectionSignals, sanitizePlainText } from '../utils/sanitize';
import { GEMINI_FLASH_MODEL, getGeminiClient, type GeminiClientOptions } from './geminiClient';

export interface ChatServiceDeps {
  geminiApiKey?: string;
  aiClient?: GoogleGenAI | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  geminiOptions?: GeminiClientOptions;
}

const DEFAULT_CHAT_TIMEOUT_MS = 45_000;

/**
 * Streams a grounded air-quality chat answer chunk by chunk.
 * Drops untrusted client-supplied model turns, checks all user turns for injection,
 * enforces AbortSignal cancellation + overall stream timeout, and degrades gracefully offline.
 */
export async function streamGroundedChat(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  deps: ChatServiceDeps = {},
): Promise<void> {
  // Never trust client-supplied assistant/model turns; retain only verified user turns
  const sanitizedMessages = messages.filter((m) => m.role === 'user');
  if (sanitizedMessages.length === 0) {
    return;
  }

  const hasInjection = sanitizedMessages.some((m) => hasPromptInjectionSignals(m.text));

  if (hasInjection) {
    const refusal =
      profile.language === 'hi'
        ? 'मैं केवल वायु गुणवत्ता, स्मॉग सुरक्षा, इनडोर हवा और कम उत्सर्जन वाली आदतों में मदद कर सकता हूँ। कृपया अपने इलाके की हवा या परिवार की सुरक्षा से जुड़ा सवाल पूछें।'
        : 'I can only help with air quality, winter smog protection, indoor air hacks, and low-emission household choices. Ask a question about your local AQI or household plan.';
    onChunk(refusal);
    return;
  }

  if (deps.signal?.aborted) {
    return;
  }

  const ai =
    deps.aiClient !== undefined
      ? deps.aiClient
      : getGeminiClient(deps.geminiApiKey, deps.geminiOptions);

  if (!ai) {
    const offlineText =
      profile.language === 'hi'
        ? `लाइव AI अभी ऑफलाइन है, लेकिन ${profile.location.locality} (AQI ${aqi.aqi}) के लिए मुख्य सलाह: व्यस्त समय में खिड़कियाँ बंद रखें, बाहर N95 मास्क पहनें और खाना बनाते समय एग्जॉस्ट चलाएं।`
        : `Live AI streaming is currently offline. For ${profile.location.locality} at AQI ${aqi.aqi} (${aqi.category}): keep windows sealed during peak traffic, wear a fitted N95 outdoors (approx. 80–95% particle filtration, high confidence), and run kitchen exhaust while cooking. Consult a doctor for severe symptoms.`;
    onChunk(offlineText);
    return;
  }

  const contents = buildGroundedChatContents(profile, aqi, sanitizedMessages);
  const systemInstruction = buildChatSystemInstruction(profile.language);

  const timeoutController = new AbortController();
  const onParentAbort = () => timeoutController.abort();
  deps.signal?.addEventListener('abort', onParentAbort, { once: true });

  const timeoutMs = deps.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, timeoutMs);

  try {
    const stream = await ai.models.generateContentStream({
      model: GEMINI_FLASH_MODEL,
      contents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: timeoutController.signal,
      },
    });

    for await (const chunk of stream) {
      if (timeoutController.signal.aborted) {
        break;
      }
      const text = chunk.text;
      if (text) {
        const safe = text.replace(/<[^>]*>/g, '');
        if (safe) {
          onChunk(safe);
        }
      }
    }

    if (timedOut) {
      throw new Error(`Chat stream timed out after ${timeoutMs}ms`);
    }
  } finally {
    clearTimeout(timer);
    deps.signal?.removeEventListener('abort', onParentAbort);
  }
}

/**
 * Formats an error safely for SSE error events without leaking stack traces or keys.
 */
export function formatSafeChatError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Unable to stream response right now.';
  return sanitizePlainText(raw, 180) || 'Unable to stream response right now.';
}
