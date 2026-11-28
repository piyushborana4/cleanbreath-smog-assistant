# Engineering Decisions Log (`DECISIONS.md`)

## GenAI Acceleration vs. Human Engineering Design

| Area | GenAI-Assisted Acceleration | Human Engineering Design & Verification |
| :--- | :--- | :--- |
| **Zod + Gemini Schemas** | Generated boilerplate schema fields and TypeScript interfaces | Enforced `ImpactExplainer` on every recommendation, bounded string/array limits to prevent token/DoS bloat, and verified strict parity between Zod (`src/shared/schemas`) and Gemini `responseSchema`. |
| **AQI Multi-Provider Pipeline** | Drafted REST payload mappings | Designed the 3-tier resilience chain (Google Maps Air Quality -> Open-Meteo -> offline conservative estimate), 12-minute coordinate-rounded TTL cache, `ETag`/`304` HTTP caching, and 429 quota-exceeded signaling without breaking user workflows. |
| **Security & Injection Defence** | Suggested initial sanitizer regexes | Architected XML delimiter wrapping, pre-stream injection refusal across **all** user turns, client `model`-turn stripping, server-authoritative AQI re-fetching, `helmet` strict production CSP/CORP/X-Frame-Options, `12/15m` AI rate limiter, SSE concurrency cap + `AbortController`, Firebase App Check verification, and Eight-Pillar `firestore.rules` audited via `@firebase/eslint-plugin-security-rules`. |
| **Accessibility (WCAG 2.2 AA)** | Generated initial Tailwind layouts | Enforced non-color-only AQI indicators (icon + text + tabular index + D3 gauge brackets), `48px` (`min-h-12`) touch targets, single `<main>` & `<h1>` per active view, view-heading focus management, `prefers-reduced-motion`, automated 44-pair contrast checks (`scripts/contrast-check.ts`), bilingual EN/HI plain language, and `axe-core` component tests. |
| **Safety & Scientific Honesty** | Generated initial indoor-hack copy | Required explicit "honesty notes" debunking houseplant air-purification myths, forbade medical diagnosis language, documented `IMPACT_MODEL_ASSUMPTIONS`, and mandated persistent severe-symptom escalation guidance. |
| **Testing & CI** | Scaffolded initial test cases | Structured isolated `createApp(deps)` dependency injection for Supertest integration tests, deterministic unit + `axe-core` + RTL behavioral suites (`>=85%` lines/functions/statements, `>=80%` branches), and CI checks for typecheck, lint, format, coverage artifact, build, `npm audit`, gitleaks, and Docker build. |

## Tools Used & Why

- **Google AI Studio & Stitch**: Validated structured JSON `responseSchema` prompts rapidly and prototyped the 6-screen mobile-first layout (`docs/design/stitch-onboarding.html`).
- **`@google/genai` (`gemini-4-hydrogen`) + Optional Vertex AI**: Chosen for low-latency structured JSON and native `AbortSignal` streaming cancellation, with zero-key Cloud Run IAM scaling via `GOOGLE_GENAI_USE_VERTEXAI=true`.
- **D3.js (`d3-shape` / `d3-scale`)**: Used for a lightweight, accessible semi-circular US-EPA AQI gauge (`AqiGauge.tsx`) with piecewise angle scaling and reduced-motion transitions.
- **Express 4 + esbuild (`dist-server/server.js`)**: Compiles TypeScript server code to fast native ESM Node output so production Docker images avoid shipping `tsx` or dev dependencies.
- **Vitest + Supertest + Testing Library + `axe-core`**: Enforces deterministic unit, integration, behavioral, and accessibility guarantees in a single fast pipeline.

## What GenAI Got Wrong & How I Corrected It

1. **Docker Boot Trap (`tsx` in `devDependencies`)**: Early Dockerfile scaffolding installed `--omit=dev` while running `./node_modules/.bin/tsx server.ts`, which would crash on Cloud Run boot. Corrected by compiling `server.ts` into `dist-server/server.js` via `esbuild` and running `node dist-server/server.js`.
2. **ESLint Silently Skipping Source Code**: Initial `eslint.config.js` ignored `src/**` and `tests/**`, masking `no-noninteractive-tabindex`, `label-has-associated-control`, `no-control-regex`, and dead handler bugs. Removed those ignores, enabled `typescript-eslint`, `react-hooks`, and `jsx-a11y`, and fixed every violation.
3. **Trusting Client AQI & Chat History**: Initial `/api/plan` and `/api/chat` handlers trusted client-sent `aqi` values and `role: "model"` history entries. Fixed routes and `chatService.ts` to re-fetch AQI server-side, strip client `model` turns, and scan every user turn for prompt injection.
4. **Over-Permissive Production CSP & Missing Stream Cancellation**: Initial Helmet CSP left `'unsafe-inline'` scripts and framing allowed globally, and `/api/chat` didn't forward `AbortSignal` into Gemini. Enforced strict production CSP (`ALLOW_EMBEDDING=false` default) and wired `req.on('close')` + timeout `AbortController` into `generateContentStream`.
5. **Global `console.error` Monkey-Patch**: Initial frontend setup wrapped `window.console.error` to detect Maps quota failures. Replaced with an explicit typed event emitter (`src/services/quotaEvents.ts`).
