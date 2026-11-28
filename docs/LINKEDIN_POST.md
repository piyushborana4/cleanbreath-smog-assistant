# CleanBreath — LinkedIn Project Showcase Draft

During severe winter smog episodes, families don't just need another red AQI number—they need calm, honest, household-specific actions they can take today without buying expensive gear.

I built **CleanBreath**, an accessible full-stack TypeScript + GenAI assistant designed for households, apartment societies, and schools navigating urban air pollution.

**How it's built:**
- **Frontend**: React 19, Tailwind CSS v4, lazy-loaded 6-screen flow (prototyped in Google Stitch), bilingual English & Hindi (`EN` / `हिन्दी`), light/dark themes, and a D3.js semi-circular AQI gauge audited against **WCAG 2.2 AA** (`axe-core` + automated 44-pair contrast checks).
- **Google Services & Resilience**: Server-side Google Maps Air Quality & Geocoding APIs (with automatic Open-Meteo failover), `@google/genai` (`gemini-4-hydrogen`) for `responseSchema` daily plans & SSE streaming chat (plus Vertex AI Workload Identity support), Firebase Auth/Firestore with hardened security rules & optional App Check, and Cloud Logging JSON traces on Cloud Run.
- **Security & Trust**: Server-authoritative AQI lookups, prompt-injection screening across all user turns with client `model`-turn stripping, strict production CSP, `12/15m` AI rate limiting, SSE concurrency guards + `AbortController` stream cancellation, and `esbuild`-compiled non-root Docker builds.

**One prompt lesson (`v1 -> v3`):**
Early free-form prompts gave messy markdown and occasionally claimed houseplants purify indoor `PM2.5`. Moving to strict `responseSchema` contracts with mandatory `ImpactExplainer` fields (`why`, `estimatedEffect`, `confidence`, `disclaimer`) and explicit scientific honesty instructions forced transparent, realistic guidance—like explaining why a sealed room + DIY MERV-13 box-fan filter beats decorative plants.

**Biggest engineering takeaway:**
GenAI scaffolding accelerates boilerplate, but production readiness still requires strict TypeScript, real ESLint coverage, server-side trust boundaries, and testing failure paths (timeouts, malformed JSON, quota exhaustion, and aborted streams).

Check out the full code, architecture diagrams, and security/a11y audits here:
`https://github.com/REPLACE_WITH_YOUR_USERNAME/cleanbreath`

#TypeScript #GoogleCloud #GeminiAPI #Accessibility #WCAG #CleanAir #SoftwareEngineering
