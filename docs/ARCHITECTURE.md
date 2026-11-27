# CleanBreath Architecture

## 1. Layered System Overview

```text
Browser (React 19 + Tailwind CSS v4 + Firebase Auth/Firestore)
  │
  ├─ GET  /api/aqi                 ──► AqiService (12-min TTL Cache)
  │                                       ├─ Primary: Google Maps Air Quality + Geocoding API
  │                                       ├─ Fallback 1: Open-Meteo Air Quality + Geocoding
  │                                       └─ Fallback 2: Conservative Offline Estimate
  │
  ├─ POST /api/plan                ──► PlanService (30-min TTL Cache)
  │                                       ├─ Prompt Builder (XML-delimited untrusted data)
  │                                       ├─ Gemini Flash (`gemini-4-hydrogen`, responseSchema)
  │                                       ├─ Zod Validation + HTML/Control Sanitization
  │                                       └─ Fallback: Deterministic Rule-Based Plan
  │
  ├─ POST /api/chat (SSE)          ──► ChatService
  │                                       ├─ Prompt-Injection Pattern Filter
  │                                       └─ Gemini `generateContentStream` -> SSE chunks
  │
  └─ POST /api/community/checklist ──► CommunityService -> Shareable Society/School Checklist
```

## 2. Security & Trust Boundaries

1. **Server-Only Secrets**: `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` are read solely inside `src/server/config/env.ts` and never bundled into `dist/`.
2. **Input & Output Validation**: Every endpoint validates inputs with Zod (`src/shared/schemas/*`), enforces a `64kb` JSON payload cap (`express.json({ limit: '64kb' })`, returning HTTP `413` on overflow and `400` on malformed JSON), validates Gemini JSON responses against `PersonalizedDailyPlanSchema`, and strips HTML/control characters (`sanitizePlanOutput`).
3. **HTTP Hardening**: `helmet` CSP headers, strict `ALLOWED_ORIGINS` CORS allow-list (403 on untrusted origins), `x-powered-by` disabled, and `express-rate-limit` on `/api/*` (returning HTTP `429`).
4. **Prompt-Injection Defence**: User-supplied city/locality strings and chat turns are wrapped inside `<user_profile>`, `<aqi_context>`, and `<user_message>` tags with `<` / `>` neutralized, paired with `hasPromptInjectionSignals` pre-filtering and explicit system instructions refusing off-topic hijacking.
5. **Hardened Firestore Rules (`firestore.rules`)**: Default-deny catch-all, path ID regex validation (`^[a-zA-Z0-9_\-]+$`), trusted-user gate (`isTrustedUser()` permitting email-verified accounts and Firebase anonymous sessions), strict `hasAll`/`hasOnly` key allowlists, `request.time` server timestamps, and `resource.data.ownerUid == request.auth.uid` list guards.

## 3. Efficiency & Resilience

- **Two-Layer Caching**: `TtlCache` caches AQI responses for 12 minutes by rounded coordinates (`0.01°`) and identical `(profile + AQI band)` plans for 30 minutes.
- **Retries & Timeouts**: `withTimeoutAndRetry` enforces per-attempt `Promise.race` timeouts + `AbortSignal` cancellation and exponential backoff with jitter.
- **Graceful Degradation**: If Maps quota is exceeded (`429`), AQI seamlessly falls back to Open-Meteo while surfacing a non-blocking banner. If Gemini is unavailable, deterministic `buildFallbackDailyPlan` ensures families still receive safe, impact-explained guidance.
- **Frontend Performance**: `gzip` compression, `AbortController` request cancellation on rapid updates, and `React.lazy` code splitting for `ChatAssistant` and `CommunityChecklist`.

## 4. Production Path: Vertex AI & Cloud Logging

- **Vertex AI**: Swap `new GoogleGenAI({ apiKey })` in `src/server/services/geminiClient.ts` with `new GoogleGenAI({ vertexai: true, project, location: 'asia-south1' })` using Workload Identity / Cloud Run Service Account IAM (`roles/aiplatform.user`)—requiring zero schema or route changes.
- **Cloud Logging**: `src/server/utils/logger.ts` emits structured Cloud Logging JSON (`timestamp`, `severity`, `service`, `event`, `requestId`, `statusCode`, `durationMs`) to stdout/stderr without PII or API keys.
