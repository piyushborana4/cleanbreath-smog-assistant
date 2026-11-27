# Prompt Evolution Log (`PROMPTS.md`)

## Iteration 1 — Free-Form Smog Advice (Rejected)
- **Attempt**: Single prompt asking for "daily smog tips for a family in Delhi".
- **Observed Flaws**:
  - Returned unparseable markdown prose instead of predictable UI cards.
  - Occasionally recommended houseplants as an air purifier substitute.
  - Missing consistent impact metrics or confidence labels.

## Iteration 2 — Structured JSON via `responseSchema` (Adopted Base)
- **Change**: Enforced `@google/genai` `responseMimeType: "application/json"` with `Type` schema (`PersonalizedDailyPlanSchema`) requiring `ImpactExplainer` (`why`, `estimatedEffect`, `confidence`, `isEstimateDisclaimer`) on every single routine, indoor hack, and sustainable alternative.
- **Observed Improvements**:
  - UI reliably renders Morning/Afternoon/Evening routines, outdoor windows, mask fit notes, and ranked budget hacks.
  - Every card displays transparent reasoning and non-medical disclaimers.

## Iteration 3 — Prompt-Injection Defence, Honesty & Bilingual Calibration (Production)
- **Changes**:
  1. Added XML delimiter fencing (`<user_profile>`, `<aqi_context>`, `<user_message>`) and neutralized `<` / `>` characters in `wrapUntrustedText()`.
  2. Added explicit honesty instruction: *"Clarify that potted houseplants alone remove negligible PM2.5 indoors compared with HEPA or DIY box-fan MERV-13 filtration."*
  3. Added strict medical safety guardrails: forbid diagnoses, require approximate directional framing (`"Approx. 35–55%..."`), and mandate severe symptom escalation advice.
  4. Added deterministic `hasPromptInjectionSignals` pre-check in `chatService.ts` and off-topic refusal rules in `systemInstructions.ts`.
  5. Added plain-language English (grade 6–8) and Hindi (Devanagari) system instruction branches.
