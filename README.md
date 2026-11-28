# CleanBreath — Winter Smog & Urban Air Quality Action Assistant

> **Live Demo**: `https://cleanbreath-REPLACE_WITH_CLOUD_RUN_URL.a.run.app` · Health endpoint: `GET /api/health` → `{"status":"ok"}`

CleanBreath helps families, apartment societies, and schools navigate severe winter smog and urban air pollution. It combines live neighbourhood air quality data with household lifestyle context to recommend low-emission daily routines, budget-aware indoor air quality hacks, and sustainable alternatives—while explaining **why** each choice helps, its **estimated effect**, and an honest **confidence level**.

## How CleanBreath Solves the Problem Statement

| Problem Requirement | CleanBreath Implementation | Source Files | API / Persistence |
| :--- | :--- | :--- | :--- |
| **1. Localized, Household-Aware Smog Guidance** | 3-step accessible onboarding (`Location`, `Household`, `Lifestyle` & budget/purifier/commute) personalizes every plan for kids, elderly, asthma sensitivity, and pets in English or Hindi. | `src/components/OnboardingWizard.tsx`, `src/hooks/useOnboardingWizard.ts`, `src/server/prompts/planPrompt.ts` | `GET /api/aqi`, `POST /api/plan` |
| **2. Live AQI Clarity & Immediate Health Context** | Interactive D3.js semi-circular AQI gauge color-coded to US-EPA bands + text/icon cues, `PM2.5`/`PM10`/`NO2`/`O3` chips, and highlighted low-pollution hourly windows. | `src/components/AqiGauge.tsx`, `src/components/dashboard/AqiHeroCard.tsx`, `src/server/services/aqiService.ts` | `GET /api/aqi` (with `ETag`/`304` + 12-min TTL cache) |
| **3. Transparent Impact & Scientific Honesty** | Every recommendation renders `ImpactExplainer` (`Why it helps`, `Estimated impact`, `Confidence`, disclaimer) and debunks houseplant air-purifier myths vs HEPA/DIY MERV-13 filtration. | `src/components/dashboard/ImpactExplainer.tsx`, `src/components/IndoorHacksPanel.tsx`, `src/components/RecommendationDetailView.tsx` | `POST /api/plan` |
| **4. Low-Emission Habits & Grounded Q&A** | Sustainable transport/waste/cooking alternatives + SSE streaming Q&A assistant anchored to the user's locality and server-verified AQI. | `src/components/dashboard/SustainableAlternativesSection.tsx`, `src/components/ChatAssistant.tsx`, `src/server/services/chatService.ts` | `POST /api/chat` (SSE) |
| **5. Neighbourhood & School Collective Action** | Generates shareable RWA/apartment society and school smog checklists and saves plans/checklists privately or publicly to Cloud Firestore. | `src/components/CommunityChecklist.tsx`, `src/server/services/communityService.ts`, `firestore.rules` | `POST /api/community/checklist`, Firestore |

## Impact Model Assumptions & Limitations

CleanBreath pairs structured Gemini reasoning with deterministic reference constants in `src/shared/utils/impactMath.ts` (`IMPACT_MODEL_ASSUMPTIONS`):

- **Transport Emissions (`DEFRA / IPCC Factors`)**: Uses indicative urban emission averages (`~170 g CO2e/km` solo car vs `~45 g CO2e/km` bus/metro, ~70–85% per-passenger reduction; high directional confidence, exact savings depend on vehicle fuel, occupancy, and congestion).
- **Indoor Filtration (`HEPA / DIY Box-Fan CADR`)**: Sealed doors/windows during smog peaks plus certified HEPA or DIY MERV-13 box-fan filtration yield ~35–70% indoor `PM2.5` reduction (`medium`/`high` confidence depending on room air-leakage and filter sealing). Houseplant filtration alone is explicitly flagged as `low` impact (`<2%` indoor PM2.5).
- **Biomass & Waste Burning Avoidance**: Stopping open garden-leaf or trash burning avoids ~`15–30 g` direct `PM2.5` per kg burned (EPA AP-42 / CPCB emission-factor range).
- **Non-Medical Disclaimer**: All estimates and routines are informational environmental guidance—**never medical diagnosis or treatment**. Persistent severe-symptom escalation alerts direct users to clinical care or emergency services.

## Criteria Mapping (Judging & Engineering Quality)

| Judging Criterion | Key Files & Controls | Verification Command |
| :--- | :--- | :--- |
| **1. Code Quality** | `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess`), `eslint.config.js` (`typescript-eslint`, `react-hooks`, `jsx-a11y`), modular `src/components/dashboard/*` & `src/components/onboarding/*`, typed `src/services/quotaEvents.ts` | `npm run typecheck && npm run lint && npm run format:check` |
| **2. Security** | `src/server/middleware/security.ts` (strict prod CSP/CORP/X-Frame-Options, `12/15m` AI rate limiter), `src/server/middleware/appCheck.ts`, server-side AQI override & model-turn stripping in `chatService.ts`/`routes/plan.ts`, `SECURITY.md`, hardened `firestore.rules` | `npm run test:ci`, `npx eslint firestore.rules` |
| **3. Efficiency** | Two-layer `TtlCache` (`src/server/utils/cache.ts`), `Cache-Control` + `ETag`/`304` on `/api/aqi`, SSE concurrency cap + `AbortController`, Vite `manualChunks` + lazy route splitting (`src/App.tsx`), multi-stage `Dockerfile` (`node dist-server/server.js`) | `npm run build`, `npm run test:ci` |
| **4. Testing** | Unit (`tests/unit/*`), Supertest API integration (`tests/integration/apiRoutes.test.ts`), RTL behavioral & `axe-core` tests (`tests/a11y/*`) exceeding 85%/80% coverage thresholds (`vitest.config.ts`) | `npm run test:coverage` |
| **5. Accessibility (WCAG 2.2 AA)** | Semantic `<ol>`/`<ul>`/`<main>`/`<h1>` landmarks, `AqiGauge` ARIA/SVG figure, `min-h-12` (`48px`) targets, EN/HI bilingual toggle, reduced motion, automated 44-pair contrast checker, `docs/ACCESSIBILITY.md` | `npm run contrast-check`, `npm run test:ci` |
| **6. Problem-Statement Alignment** | Full 6-screen flow + `ImpactExplainer` on dashboard/detail/community cards + scientific honesty notes + `IMPACT_MODEL_ASSUMPTIONS` | `npm run test:ci` |
| **7. Google Service Usage** | Gemini Flash (`gemini-4-hydrogen`) + optional Vertex AI (`GOOGLE_GENAI_USE_VERTEXAI=true`), Google Maps AQ & Geocoding (`X-Goog-Maps-Solution-ID`), Firebase Auth/Firestore/App Check, Cloud Logging trace JSON, Cloud Run `deploy.sh`, `docs/GOOGLE_SERVICES.md` | `npm run build && ./deploy.sh` |

## Documentation & Reference

- [Google Services Integration Guide](docs/GOOGLE_SERVICES.md)
- [Architecture, Mermaid Flows & Scaling](docs/ARCHITECTURE.md)
- [WCAG 2.2 AA Accessibility & Contrast Report](docs/ACCESSIBILITY.md)
- [Security Threat Model & Policy](SECURITY.md)
- [Prompt Evolution Log](docs/PROMPTS.md)
- [Engineering Decisions Log](docs/DECISIONS.md)
- [Google Stitch Onboarding Export](docs/design/stitch-onboarding.html)

## NPM Scripts Cheat Sheet

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Start Express API + Vite dev middleware on port `3000` |
| `npm run typecheck` | Run TypeScript strict compiler (`tsc --noEmit`) |
| `npm run lint` | Run `tsc --noEmit` + ESLint across `src/`, `tests/`, `server.ts`, and `firestore.rules` |
| `npm run format:check` | Verify Prettier formatting across source, tests, and scripts |
| `npm run contrast-check` | Verify all 44 WCAG 2.2 AA light/dark contrast pairs in `src/index.css` |
| `npm run test:coverage` | Run Vitest unit, integration, RTL behavioral, and `axe-core` suites with coverage gates |
| `npm run build` | Build production React bundle (`dist/`) + esbuild server bundle (`dist-server/server.js`) |
| `npm start` | Run compiled production server (`node dist-server/server.js`) |

> **Firebase Client Config Note**: The `apiKey` in `firebase-applet-config.json` is Firebase's public Web SDK project identifier (not a secret). Restrict it by HTTP referrer in Google Cloud Console and rely on `firestore.rules` + optional Firebase App Check (`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` / `FIREBASE_APP_CHECK_ENABLED=true`) for access control.

## Quick Start & Cloud Run Deployment

1. Copy environment variables (never commit `.env`):
   ```bash
   npm ci --ignore-scripts --legacy-peer-deps
   cp .env.example .env
   npm run dev
   ```
2. Deploy to Google Cloud Run using Secret Manager (no raw keys in repo or CI):
   ```bash
   export PROJECT_ID="your-gcp-project-id"
   ./deploy.sh
   ```
   Or follow step-by-step commands in [`deploy.sh`](deploy.sh).
