# CleanBreath — Winter Smog & Urban Air Quality Action Assistant

CleanBreath helps families, apartment societies, and schools navigate severe winter smog and urban air pollution. It combines live neighbourhood air quality data with household lifestyle context to recommend low-emission daily routines, budget-aware indoor air quality hacks, and sustainable alternatives—while explaining **why** each choice helps, its **estimated effect**, and an honest **confidence level**.

## Core Capabilities

- **Household & Location Onboarding**: City/locality or browser geolocation, household composition (children, older adults, asthma/respiratory sensitivity, pets), commute mode, home type, air purifier ownership, budget tier, and English/Hindi (`EN` / `हिन्दी`) toggle.
- **Live Air Quality & Forecast**: Real-time AQI, pollutant concentrations (`PM2.5`, `PM10`, `NO2`, `O3`), and upcoming hourly windows with lower-pollution windows highlighted.
- **Personalised Daily Plan (Structured Gemini JSON)**: Morning, afternoon, and evening routines, commute advice, outdoor activity windows, mask guidance, cooking/ventilation timing, ranked budget-aware indoor hacks (including honest plants-vs-HEPA clarity), and sustainable alternatives.
- **Impact Explainer on Every Choice**: Every single recommendation displays `Why it helps`, `Estimated impact`, `Confidence (low/medium/high)`, and a non-medical estimate disclaimer.
- **Grounded Streaming Assistant**: Server-Sent Events (SSE) chat grounded in the active household profile and live AQI.
- **Community Mode**: Shareable action checklists for apartment societies / RWAs and schools.
- **Safety First**: Persistent non-diagnostic medical disclaimer and explicit severe-symptom escalation guidance.

## Project Documentation

- [Architecture & Trust Boundaries](docs/ARCHITECTURE.md)
- [Prompt Evolution Log](docs/PROMPTS.md)
- [Engineering Decisions Log](docs/DECISIONS.md)

## Google Services Used & Why Each Was Chosen

| Google Service | Role in CleanBreath | Why Chosen |
|---|---|---|
| **Gemini API (`@google/genai`, `gemini-4-hydrogen`)** | Structured JSON daily plans, community checklists, and SSE streaming chat | Low-latency Flash-tier reasoning, native `responseSchema` enforcement for strict JSON contracts, system instructions, and token streaming. |
| **Google Maps Platform (Air Quality & Geocoding APIs)** | Server-side retrieval of live AQI, pollutant breakdown, 24h forecast, and geocoding | Provides localized US-EPA/Universal AQI, pollutant concentrations (`pm25`, `pm10`, `no2`, `o3`), and hourly forecasts via a unified REST contract. |
| **Firebase (Anonymous & Google Auth + Firestore)** | One-tap Guest (`signInAnonymously`) & Google (`signInWithPopup`) auth + persistent plans/checklists | Zero-ops document persistence with hardened field-level `firestore.rules` enforcing owner isolation, anonymous/verified gates, and strict schema validation. |
| **Google Cloud Run** | Containerized Express + React production runtime (`Dockerfile`) | Scales to zero between smog episodes, runs non-root on port 3000/8080, and natively supports SSE streaming responses. |
| **Google Secret Manager** | Production injection of `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` | Keeps all API credentials strictly off client bundles and outside version control. |
| **Google Cloud Logging** | Structured JSON request latency & error observability (`src/server/utils/logger.ts`) | Emits `INFO`/`WARNING`/`ERROR` JSON records to stdout/stderr without PII or secret leakage. |
| **Google AI Studio & Stitch** | Rapid prompt engineering (`responseSchema` tuning) and accessible UI layout iteration | Accelerated validation of structured JSON outputs and multi-screen WCAG 2.2 AA hierarchy. |
| **Vertex AI (Documented Production Path)** | Enterprise scaling path for regional data residency & VPC Service Controls | Drop-in swap via `@google/genai` (`vertexai: true`) using least-privilege Cloud Run IAM service accounts without changing application logic. |

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment** (copy `.env.example` to `.env` locally; never commit `.env`):
   ```bash
   cp .env.example .env
   ```
3. **Run development server** (Express API + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```
4. **Verify all quality gates** (typecheck, ESLint + Firestore rules, Prettier, unit/integration/axe a11y tests with >=80% coverage, production Vite build):
   ```bash
   npm run lint
   npm run format:check
   npm run test:coverage
   npm run build
   ```

## Deploying to Cloud Run with Secret Manager

Follow these steps to deploy CleanBreath using a least-privilege service account and Secret Manager:

1. **Set project & enable APIs**:
   ```bash
   export PROJECT_ID="your-gcp-project-id"
   export REGION="asia-south1"
   gcloud config set project "$PROJECT_ID"
   gcloud services enable run.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com logging.googleapis.com
   ```

2. **Create secrets in Secret Manager** (never commit keys or pass raw keys in `cloudbuild.yaml`):
   ```bash
   printf '%s' "$GEMINI_API_KEY" | gcloud secrets create cleanbreath-gemini-key --data-file=- --replication-policy=automatic
   printf '%s' "$GOOGLE_MAPS_API_KEY" | gcloud secrets create cleanbreath-maps-key --data-file=- --replication-policy=automatic
   ```

3. **Create a least-privilege Cloud Run service account**:
   ```bash
   gcloud iam service-accounts create cleanbreath-runner \
     --display-name="CleanBreath Cloud Run Runner"

   SA_EMAIL="cleanbreath-runner@${PROJECT_ID}.iam.gserviceaccount.com"

   gcloud secrets add-iam-policy-binding cleanbreath-gemini-key \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/secretmanager.secretAccessor"

   gcloud secrets add-iam-policy-binding cleanbreath-maps-key \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/secretmanager.secretAccessor"

   gcloud projects add-iam-policy-binding "$PROJECT_ID" \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/logging.logWriter"
   ```

4. **Build and deploy the non-root container to Cloud Run**:
   ```bash
   gcloud run deploy cleanbreath \
     --source . \
     --platform managed \
     --region "$REGION" \
     --service-account "$SA_EMAIL" \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars "NODE_ENV=production,ALLOWED_ORIGINS=https://your-service-url.a.run.app" \
     --set-secrets "GEMINI_API_KEY=cleanbreath-gemini-key:latest,GOOGLE_MAPS_API_KEY=cleanbreath-maps-key:latest"
   ```

5. **Verify health & Cloud Logging**:
   ```bash
   curl -sSf "https://your-service-url.a.run.app/api/health"
   ```
   Structured JSON logs emitted by `src/server/utils/logger.ts` appear automatically in Google Cloud Logging (`resource.type="cloud_run_revision"`).
