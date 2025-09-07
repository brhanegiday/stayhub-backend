# CI/CD Pipeline

This repository uses a unified CI/CD pipeline that handles both continuous integration and deployment.

## Pipeline Overview

The pipeline is triggered on:

-   **Push** to `main`, `master`, or `develop` branches
-   **Pull requests** to `main`, `master`, or `develop` branches
-   **Tags** starting with `v` (e.g., `v1.0.0`)
-   **Manual workflow dispatch** with environment selection

## Jobs

### 🧪 CI Jobs

#### 1. Test & Quality

-   **Node.js versions**: 18.x, 20.x
-   **Database**: MongoDB 7.0
-   **Steps**:
    -   TypeScript type checking
    -   Test suite with coverage
    -   Security audit
    -   Application build

### 🚀 CD Jobs (only on non-PR events)

#### 2. Build & Push Image

-   Builds multi-platform Docker image (amd64, arm64)
-   Pushes to GitHub Container Registry
-   Uses buildx cache for faster builds

#### 3. Deploy Staging

-   **Triggers**: Push to `develop` or manual dispatch to staging
-   Deploys latest image to staging environment
-   Runs health checks

#### 4. Deploy Production

-   **Triggers**: Version tags (`v*`) or manual dispatch to production
-   Deploys to production environment
-   Runs health checks
-   Sends Slack notification on success

#### 5. Notify Status

-   Sends Slack notifications on failures
-   Only runs if any job fails

## Environment Variables

Required secrets:

-   `CODECOV_TOKEN` - For coverage reporting
-   `SLACK_WEBHOOK_URL` - For notifications

Test environment variables:

-   `NODE_ENV=test`
-   `MONGODB_URI=mongodb://localhost:27017/stayhub-test`
-   `JWT_SECRET=test_jwt_secret_key`
-   `JWT_REFRESH_SECRET=test_refresh_secret_key`

## Deployment Customization

To customize deployments, update the deployment steps in:

-   `deploy-staging` job
-   `deploy-production` job

Add your deployment commands (AWS, Azure, DigitalOcean, etc.) in the respective steps.

## Manual Deployment

You can trigger manual deployments via GitHub Actions UI:

1. Go to Actions tab
2. Select "CI/CD Pipeline"
3. Click "Run workflow"
4. Choose environment (staging/production)
