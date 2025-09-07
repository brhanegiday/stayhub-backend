#!/bin/bash

# StayHub Backend Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

# Default values
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
PROJECT_NAME="stayhub-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Deploying to ${ENVIRONMENT} environment"
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}"
            log_info "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    ENV_FILE=".env.${ENVIRONMENT}"
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file ${ENV_FILE} not found"
        if [ "$ENVIRONMENT" = "development" ]; then
            ENV_FILE=".env"
            if [ ! -f "$ENV_FILE" ]; then
                log_error "No environment file found"
                exit 1
            fi
        else
            log_error "Environment file ${ENV_FILE} is required"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Build application
build_application() {
    log_info "Building application..."
    
    # Build Docker image
    docker build -t "${PROJECT_NAME}:${VERSION}" .
    
    # Tag as latest for the environment
    docker tag "${PROJECT_NAME}:${VERSION}" "${PROJECT_NAME}:${ENVIRONMENT}-latest"
    
    log_success "Application built successfully"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    # Choose compose file based on environment
    COMPOSE_FILE="docker-compose.yml"
    if [ "$ENVIRONMENT" = "development" ]; then
        COMPOSE_FILE="docker-compose.dev.yml"
    fi
    
    # Set environment variables
    export DOCKER_IMAGE="${PROJECT_NAME}:${VERSION}"
    export COMPOSE_PROJECT_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f $COMPOSE_FILE --env-file "$ENV_FILE" down
    
    # Start new services
    log_info "Starting new services..."
    docker-compose -f $COMPOSE_FILE --env-file "$ENV_FILE" up -d
    
    log_success "Application deployed successfully"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for database
    log_info "Waiting for database..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Database failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for application
    log_info "Waiting for application..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:5000/api/health &> /dev/null; then
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Application failed to start within 60 seconds"
        exit 1
    fi
    
    log_success "All services are ready"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Basic health check
    if ! curl -f http://localhost:5000/api/health &> /dev/null; then
        log_error "Health check failed"
        return 1
    fi
    
    # Database connectivity check
    if ! curl -f http://localhost:5000/api/health/db &> /dev/null; then
        log_warning "Database health check failed"
    fi
    
    log_success "Health checks passed"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Test basic endpoints
    endpoints=(
        "/api/health"
        "/api/auth/health"
        "/api/properties/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f "http://localhost:5000${endpoint}" &> /dev/null; then
            log_success "Endpoint ${endpoint} is responding"
        else
            log_warning "Endpoint ${endpoint} is not responding"
        fi
    done
    
    log_success "Smoke tests completed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose down
    
    # Start previous version (assuming it's tagged as previous)
    export DOCKER_IMAGE="${PROJECT_NAME}:previous"
    docker-compose up -d
    
    log_info "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log_success "Cleanup completed"
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo "=========================="
    docker-compose ps
    echo "=========================="
    
    log_info "Application logs (last 20 lines):"
    docker-compose logs --tail=20 app
}

# Main deployment process
main() {
    log_info "Starting deployment of ${PROJECT_NAME} v${VERSION} to ${ENVIRONMENT}"
    
    # Trap errors and rollback
    trap 'log_error "Deployment failed. Rolling back..."; rollback; exit 1' ERR
    
    validate_environment
    check_prerequisites
    
    # Skip build for production if using pre-built images
    if [ "$ENVIRONMENT" != "production" ] || [ "$VERSION" = "latest" ]; then
        build_application
    fi
    
    deploy_application
    wait_for_services
    
    if run_health_checks; then
        run_smoke_tests
        show_status
        cleanup
        
        log_success "Deployment completed successfully!"
        log_info "Application is running at: http://localhost:5000"
        log_info "API Documentation: http://localhost:5000/api/docs"
        
        if [ "$ENVIRONMENT" = "development" ]; then
            log_info "MongoDB Express: http://localhost:8081"
        fi
    else
        log_error "Health checks failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [environment] [version]"
        echo ""
        echo "Arguments:"
        echo "  environment  Target environment (development|staging|production)"
        echo "  version      Version to deploy (default: latest)"
        echo ""
        echo "Examples:"
        echo "  $0 development"
        echo "  $0 staging v1.2.3"
        echo "  $0 production latest"
        echo ""
        echo "Special commands:"
        echo "  $0 --rollback  Rollback to previous version"
        echo "  $0 --status    Show current deployment status"
        echo "  $0 --cleanup   Cleanup unused resources"
        exit 0
        ;;
    --rollback)
        rollback
        exit 0
        ;;
    --status)
        show_status
        exit 0
        ;;
    --cleanup)
        cleanup
        exit 0
        ;;
    *)
        main
        ;;
esac