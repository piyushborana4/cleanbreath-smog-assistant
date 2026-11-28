import type { AirQualitySnapshot, AqiQuery } from '../shared/schemas/aqi.schema';
import type { ChatRequest, ChatStreamEvent } from '../shared/schemas/chat.schema';
import type {
  CommunityChecklist,
  CommunityChecklistRequest,
} from '../shared/schemas/community.schema';
import type { PersonalizedDailyPlan, PlanRequest } from '../shared/schemas/plan.schema';
import { getAppCheckToken } from './firebase';
import { emitMapsQuotaExceeded } from './quotaEvents';

async function buildApiHeaders(includeJsonContentType: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const appCheckToken = await getAppCheckToken();
  if (appCheckToken) {
    headers['X-Firebase-AppCheck'] = appCheckToken;
  }
  return headers;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/**
 * Fetches live AQI + forecast from /api/aqi and triggers the quota notice event if Maps quota is hit.
 */
export async function fetchLiveAqi(
  params: AqiQuery,
  signal?: AbortSignal,
): Promise<AirQualitySnapshot> {
  const qs = new URLSearchParams();
  if (params.city) qs.set('city', params.city);
  if (params.locality) qs.set('locality', params.locality);
  if (params.lat !== undefined && params.lng !== undefined) {
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
  }
  if (params.lang) qs.set('lang', params.lang);

  const headers = await buildApiHeaders(false);
  const res = await fetch(`/api/aqi?${qs.toString()}`, { headers, signal });
  if (!res.ok) {
    if (res.status === 429) {
      emitMapsQuotaExceeded();
    }
    throw new Error(await parseErrorMessage(res));
  }

  const snapshot = (await res.json()) as AirQualitySnapshot;
  if (snapshot.mapsQuotaExceeded) {
    emitMapsQuotaExceeded();
  }
  return snapshot;
}

/**
 * Requests a personalized daily plan from POST /api/plan.
 */
export async function fetchDailyPlan(
  payload: PlanRequest,
  signal?: AbortSignal,
): Promise<PersonalizedDailyPlan> {
  const headers = await buildApiHeaders(true);
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return (await res.json()) as PersonalizedDailyPlan;
}

/**
 * Generates a shareable community checklist from POST /api/community/checklist.
 */
export async function fetchCommunityChecklist(
  payload: CommunityChecklistRequest,
  signal?: AbortSignal,
): Promise<CommunityChecklist> {
  const headers = await buildApiHeaders(true);
  const res = await fetch('/api/community/checklist', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return (await res.json()) as CommunityChecklist;
}

/**
 * Streams grounded assistant responses over SSE from POST /api/chat.
 */
export async function streamAssistantChat(
  payload: ChatRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers = await buildApiHeaders(true);
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Streaming response unavailable in this browser.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';

    for (const block of lines) {
      const dataLine = block
        .split('\n')
        .find((l) => l.startsWith('data: '))
        ?.slice(6);
      if (!dataLine) continue;

      const evt = JSON.parse(dataLine) as ChatStreamEvent;
      if (evt.type === 'chunk') {
        onChunk(evt.text);
      } else if (evt.type === 'error') {
        throw new Error(evt.message);
      }
    }
  }
}
