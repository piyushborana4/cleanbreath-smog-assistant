# Security Policy & Architecture

## Threat Model & Trust Boundaries

CleanBreath treats all client-submitted inputs, third-party API payloads, and browser storage as **untrusted** across three primary boundaries:

1. **Browser → Express API (`/api/*`)**:
   - **Schema Validation**: Every request body and query is validated with strict `zod` schemas (`src/shared/schemas/*`) and capped at `64kb` (`express.json({ limit: '64kb' })`). Malformed JSON returns `400`.
   - **Server-Authoritative AQI**: `/api/plan` and `/api/chat` **ignore** client-supplied `aqi` numbers and re-fetch/compute AQI server-side from `aqiService.ts` using the validated location so spoofed severity cannot manipulate recommendations.
   - **Chat History & Prompt Injection Defense**: `/api/chat` strips any client-supplied `role: "model"` turns (`chatService.ts` & `routes/chat.ts`), caps history length (`MAX_CHAT_HISTORY_CHARS`), wraps untrusted strings in `<tag>` delimiters (`wrapUntrustedText`), strips HTML (`sanitizePlainText` / `sanitizePlanOutput`), and filters every `user` turn through `hasPromptInjectionSignals`.
   - **Stream Cancellation & Concurrency**: `/api/chat` attaches an `AbortController` to `req.on('close')` and a server timeout (`CHAT_STREAM_TIMEOUT_MS`), forwarding the `abortSignal` directly into Gemini's `generateContentStream`, and limits concurrent active SSE streams per IP (`CHAT_MAX_CONCURRENT_PER_IP`, default `2`).
   - **Rate Limiting**: Global `/api` rate limit (`API_RATE_LIMIT_MAX`, default `90` req / 15 min) plus strict AI endpoint rate limit (`AI_RATE_LIMIT_MAX`, default `12` req / 15 min) on `/api/plan`, `/api/chat`, and `/api/community/checklist`.
   - **Firebase App Check (Optional Hardening)**: When `FIREBASE_APP_CHECK_ENABLED=true`, `/api/*` (except `/api/health`) verifies `X-Firebase-AppCheck` RS256 JWTs against Google's public JWKS (`src/server/middleware/appCheck.ts`).

2. **Express Server → External Google / Open-Meteo Services**:
   - Server secrets (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`) never leave Node.js (`process.env` only, never `VITE_*`).
   - Supports passwordless Cloud Run authentication via `GOOGLE_GENAI_USE_VERTEXAI=true` + Workload Identity (`src/server/services/geminiClient.ts`).
   - All outbound calls enforce timeouts and clean error sanitization (`formatSafeChatError`, `apiErrorHandler`) with zero stack traces or secret leakage.

3. **Client → Cloud Firestore (`firestore.rules`)**:
   - Strict owner-only rules (`request.auth.uid == userId` and `ownerUid == request.auth.uid`) on `users/{userId}`, `profiles`, and `plans`.
   - Immutable `ownerUid` and `createdAt` enforcement on updates, strict field allow-lists (`hasOnly`), and validated enum/length constraints audited by `@firebase/eslint-plugin-security-rules`.
   - Client Firebase `apiKey` in `firebase-applet-config.json` is an intended public Web SDK project identifier, restricted by HTTP referrer and Firebase Security Rules.

## Transport & Browser Hardening (`NODE_ENV=production`)

When `NODE_ENV=production` (and `ALLOW_EMBEDDING` is `false`, the production default), Helmet enforces:
- `Content-Security-Policy`: `default-src 'self'`, `script-src 'self'` (no `'unsafe-inline'`), `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, and strict `connect-src` without `ws:`/`wss:` wildcards.
- `X-Frame-Options: DENY`
- `Cross-Origin-Resource-Policy: same-origin`
- Strict CORS origin allow-list (`ALLOWED_ORIGINS` / `APP_URL` / matching host).

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for suspected security vulnerabilities.
Instead, report security issues privately to the repository maintainers via GitHub Security Advisories (`Security -> Advisories -> Report a vulnerability`) with:
- Affected endpoint or component
- Steps to reproduce or proof of concept
- Potential impact

We aim to acknowledge reports within 48 hours and provide a fix or mitigation plan promptly.
