# Engineering Decisions Log (`DECISIONS.md`)

This document records what was scaffolded with GenAI assistance versus what the human engineer explicitly designed, constrained, and verified.

| Area | GenAI-Assisted Acceleration | Human Engineering Design & Verification |
|---|---|---|
| **Zod + Gemini Schemas** | Generated boilerplate schema fields and TypeScript interfaces | Enforced `ImpactExplainer` on every recommendation, bounded string/array limits to prevent token/DoS bloat, and verified strict parity between Zod (`src/shared/schemas`) and Gemini `responseSchema`. |
| **AQI Multi-Provider Pipeline** | Drafted REST payload mappings | Designed the 3-tier resilience chain (Google Maps Air Quality -> Open-Meteo -> offline conservative estimate), 12-minute coordinate-rounded TTL cache, and 429 quota-exceeded signaling without breaking user workflows. |
| **Security & Injection Defence** | Suggested initial sanitizer regexes | Architected XML delimiter wrapping, pre-stream injection refusal, `helmet` CSP + CORS allow-list, `64kb` body caps (`413`/`400`), and Eight-Pillar `firestore.rules` supporting both verified Google and Firebase anonymous sessions audited via `@firebase/eslint-plugin-security-rules`. |
| **Accessibility (WCAG 2.2 AA)** | Generated initial Tailwind layouts | Enforced non-color-only AQI indicators (icon + text + tabular index), `48px` (`min-h-12`) touch targets, visible focus rings, route/step focus management, `prefers-reduced-motion`, `aria-live="polite"` chat/loading regions, bilingual EN/HI plain language, and automated `axe-core` component tests. |
| **Safety & Scientific Honesty** | Generated initial indoor-hack copy | Required explicit "honesty notes" debunking houseplant air-purification myths, forbade medical diagnosis language, documented `IMPACT_MODEL_ASSUMPTIONS`, and mandated persistent severe-symptom escalation guidance. |
| **Testing & CI** | Scaffolded initial test cases | Structured isolated `createApp(deps)` dependency injection for Supertest integration tests (success, timeout, malformed AI output, `429` rate limit), deterministic unit + `axe-core` coverage (`>=80%` across lines/branches/functions/statements), and CI enforcement of lint + format + coverage + `npm audit`. |
