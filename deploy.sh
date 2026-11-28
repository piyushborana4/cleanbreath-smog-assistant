#!/usr/bin/env bash
set -euo pipefail

# Deploy CleanBreath to Google Cloud Run using Secret Manager (no raw keys).
# Usage:
#   export PROJECT_ID="your-gcp-project-id"
#   export REGION="asia-south1"            # optional, defaults to asia-south1
#   export ALLOWED_ORIGINS="https://..."   # optional comma-separated origins
#   ./deploy.sh

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID to your Google Cloud project ID}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-cleanbreath}"
SA_NAME="${SA_NAME:-cleanbreath-runner}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Configuring project ${PROJECT_ID} (${REGION})..."
gcloud config set project "${PROJECT_ID}" >/dev/null

gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  logging.googleapis.com \
  aiplatform.googleapis.com

if ! gcloud iam service-accounts describe "${SA_EMAIL}" >/dev/null 2>&1; then
  echo "==> Creating least-privilege service account ${SA_EMAIL}..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="CleanBreath Cloud Run Runner"
fi

echo "==> Granting least-privilege IAM roles (Logging, Vertex AI, Secret Manager)..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter" >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user" >/dev/null

for SECRET_NAME in cleanbreath-gemini-key cleanbreath-maps-key; do
  if gcloud secrets describe "${SECRET_NAME}" >/dev/null 2>&1; then
    gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" >/dev/null
  else
    echo "NOTE: Secret ${SECRET_NAME} not found yet. Create it with:"
    echo "  printf '%s' \"\$VALUE\" | gcloud secrets create ${SECRET_NAME} --data-file=- --replication-policy=automatic"
  fi
done

ENV_VARS="NODE_ENV=production,ALLOW_EMBEDDING=false,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION}"
if [[ -n "${ALLOWED_ORIGINS:-}" ]]; then
  ENV_VARS="${ENV_VARS},ALLOWED_ORIGINS=${ALLOWED_ORIGINS}"
fi

SECRETS_ARG="GEMINI_API_KEY=cleanbreath-gemini-key:latest,GOOGLE_MAPS_API_KEY=cleanbreath-maps-key:latest"

echo "==> Deploying ${SERVICE_NAME} to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --platform managed \
  --region "${REGION}" \
  --service-account "${SA_EMAIL}" \
  --allow-unauthenticated \
  --port 3000 \
  --min-instances 0 \
  --max-instances 5 \
  --concurrency 40 \
  --cpu 1 \
  --memory 512Mi \
  --set-env-vars "${ENV_VARS}" \
  --set-secrets "${SECRETS_ARG}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format='value(status.url)')"
echo "==> Deployed: ${SERVICE_URL}"
echo "==> Verifying /api/health..."
curl -sSf "${SERVICE_URL}/api/health"
echo ""
