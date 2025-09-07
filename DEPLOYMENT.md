# Deployment Guide

This document provides comprehensive instructions for deploying the StayHub Backend API.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [GitHub Actions Setup](#github-actions-setup)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment Options](#cloud-deployment-options)
- [Monitoring and Logging](#monitoring-and-logging)

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- MongoDB instance
- GitHub account for CI/CD
- Cloud provider account (AWS, Azure, GCP, etc.)

## Environment Setup

### 1. Environment Variables

Create environment-specific configuration files:

```bash
# Development
cp .env.example .env

# Staging
cp .env.staging.example .env.staging

# Production
cp .env.production.example .env.production
```

### 2. Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/staging/production) | ✅ |
| `PORT` | Server port | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ❌ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ❌ |
| `CLOUDINARY_*` | Cloudinary configuration | ❌ |
| `CLIENT_URL` | Frontend application URL | ✅ |

## GitHub Actions Setup

### 1. Repository Secrets

Configure the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

#### Required Secrets
- `CODECOV_TOKEN`: For code coverage reporting
- `SNYK_TOKEN`: For security scanning
- `SLACK_WEBHOOK_URL`: For deployment notifications

#### Environment-Specific Secrets (per environment)
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### 2. Environment Protection Rules

1. Go to `Settings > Environments`
2. Create `staging` and `production` environments
3. Add protection rules:
   - **Production**: Require reviews, restrict to main branch
   - **Staging**: Allow develop branch deployments

### 3. Branch Protection

Configure branch protection for `main` and `develop` branches:
- Require PR reviews
- Require status checks to pass
- Require branches to be up to date

## Docker Deployment

### Local Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production Deployment

```bash
# Build and start production environment
docker-compose up -d

# Check service health
docker-compose ps

# View application logs
docker-compose logs -f app

# Scale services
docker-compose up -d --scale app=3
```

### Docker Registry

The CI/CD pipeline automatically builds and pushes images to GitHub Container Registry:

```bash
# Pull latest production image
docker pull ghcr.io/your-username/stayhub-backend:latest

# Run production container
docker run -d \
  --name stayhub-backend \
  -p 5000:5000 \
  --env-file .env.production \
  ghcr.io/your-username/stayhub-backend:latest
```

## Cloud Deployment Options

### AWS ECS

1. **Create ECS Cluster**
2. **Create Task Definition** with environment variables
3. **Set up Application Load Balancer**
4. **Configure Auto Scaling**

```json
{
  "family": "stayhub-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "stayhub-backend",
      "image": "ghcr.io/your-username/stayhub-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/stayhub-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Azure Container Instances

```bash
# Create resource group
az group create --name stayhub-rg --location eastus

# Deploy container
az container create \
  --resource-group stayhub-rg \
  --name stayhub-backend \
  --image ghcr.io/your-username/stayhub-backend:latest \
  --ports 5000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables \
    MONGODB_URI=$MONGODB_URI \
    JWT_SECRET=$JWT_SECRET
```

### Google Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy stayhub-backend \
  --image ghcr.io/your-username/stayhub-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest
```

### DigitalOcean App Platform

Create `app.yaml`:

```yaml
name: stayhub-backend
services:
- name: api
  source_dir: /
  github:
    repo: your-username/stayhub-backend
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 5000
  env:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${MONGODB_URI}
  - key: JWT_SECRET
    value: ${JWT_SECRET}
databases:
- name: stayhub-db
  engine: MONGODB
  version: "5"
```

## Monitoring and Logging

### Health Checks

The application includes health check endpoints:

```bash
# Basic health check
curl https://your-api-domain.com/api/health

# Detailed health check
curl https://your-api-domain.com/api/health/detailed
```

### Logging

Logs are structured and include:
- Request/response logging
- Error tracking
- Performance metrics
- Security events

### Monitoring Setup

1. **Application Monitoring**: Use Sentry or similar
2. **Infrastructure Monitoring**: Use Datadog, New Relic, or CloudWatch
3. **Log Aggregation**: Use ELK stack or cloud logging services
4. **Alerting**: Set up alerts for errors, high response times, and resource usage

### Example Monitoring Configuration

```javascript
// Add to your application
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

## Rollback Strategy

### Automatic Rollback

The CI/CD pipeline includes automatic rollback on deployment failure.

### Manual Rollback

```bash
# Rollback to previous version
docker-compose down
docker pull ghcr.io/your-username/stayhub-backend:previous-tag
docker-compose up -d

# Or using cloud-specific commands
# AWS ECS
aws ecs update-service --cluster stayhub --service stayhub-backend --task-definition stayhub-backend:previous

# Google Cloud Run
gcloud run deploy stayhub-backend --image ghcr.io/your-username/stayhub-backend:previous-tag
```

## Scaling Considerations

1. **Database**: Use MongoDB Atlas or managed database service
2. **File Storage**: Use cloud storage (S3, Google Cloud Storage)
3. **Session Storage**: Use Redis for session management
4. **Load Balancing**: Use cloud load balancers
5. **CDN**: Use CloudFront, CloudFlare for static assets
6. **Auto Scaling**: Configure based on CPU/memory usage

## Security Checklist

- [ ] Environment variables properly secured
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Database credentials rotated
- [ ] Secrets management implemented
- [ ] Container running as non-root user
- [ ] Network segmentation configured
- [ ] Monitoring and alerting configured

## Troubleshooting

### Common Issues

1. **Container won't start**: Check environment variables and logs
2. **Database connection failed**: Verify MongoDB URI and network access
3. **High memory usage**: Monitor and adjust container resources
4. **Slow response times**: Check database queries and add indexes

### Debugging Commands

```bash
# Check container logs
docker-compose logs -f app

# Connect to running container
docker-compose exec app sh

# Check database connectivity
docker-compose exec app npm run test:db

# Run health checks
docker-compose exec app curl http://localhost:5000/api/health
```

For additional support, check the project's GitHub issues or contact the development team.