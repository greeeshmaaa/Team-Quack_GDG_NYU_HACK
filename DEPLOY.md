# Deploying To Google Cloud Run

This project deploys as two services:

- `quack-backend`: FastAPI backend
- `quack-frontend`: Next.js frontend

Do not deploy with `.env` or a service-account JSON inside the image.

## 1. One-time setup

Create an Artifact Registry repository:

```bash
gcloud artifacts repositories create quack \
  --repository-format=docker \
  --location=us-central1
```

Create a backend runtime service account:

```bash
gcloud iam service-accounts create quack-backend-sa \
  --display-name="Quack Backend Runtime"
```

Grant it Vertex AI access:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:quack-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## 2. Build backend image

```bash
gcloud builds submit \
  --config cloudbuild.backend.yaml \
  --substitutions _IMAGE_TAG=latest \
  .
```

## 3. Deploy backend to Cloud Run

```bash
gcloud run deploy quack-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/quack/quack-backend:YOUR_IMAGE_TAG \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account quack-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1,VERTEX_MODEL_NAME=gemini-2.5-flash,VERTEX_IMAGE_MODEL_NAME=imagen-4.0-generate-001,LANDMARK_CONFIDENCE_THRESHOLD=0.5,DEBUG=false
```

Notes:

- Do not set `GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run.
- Cloud Run will use the attached service account automatically.

## 4. Build frontend image

Replace `YOUR_BACKEND_URL` with the deployed backend URL from the previous step.

```bash
gcloud builds submit \
  --config cloudbuild.frontend.yaml \
  --substitutions _IMAGE_TAG=latest,_NEXT_PUBLIC_API_BASE_URL=YOUR_BACKEND_URL \
  .
```

## 5. Deploy frontend to Cloud Run

```bash
gcloud run deploy quack-frontend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/quack/quack-frontend:YOUR_IMAGE_TAG \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

## 6. Local Docker smoke test

Backend:

```bash
docker build -f backend/Dockerfile -t quack-backend .
docker run --rm -p 8000:8080 \
  -e GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID \
  -e GOOGLE_CLOUD_LOCATION=us-central1 \
  -e VERTEX_MODEL_NAME=gemini-2.5-flash \
  -e VERTEX_IMAGE_MODEL_NAME=imagen-4.0-generate-001 \
  -e LANDMARK_CONFIDENCE_THRESHOLD=0.5 \
  quack-backend
```

Frontend:

```bash
docker build -f frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 \
  -t quack-frontend .
docker run --rm -p 3000:8080 quack-frontend
```

## Security checklist

- `.env` is ignored and should not be pushed.
- Do not commit service-account JSON files.
- Only `NEXT_PUBLIC_API_BASE_URL` should be public on the frontend.
- Keep all private credentials in Google Cloud service accounts or Secret Manager.
