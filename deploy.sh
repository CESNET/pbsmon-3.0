
#!/bin/bash

# PBSMON 2.0 Deployment Script
# This script pulls the latest code and restarts Docker containers
# Usage: ./deploy.sh [--skip-pull]
# --skip-pull: Skip pulling the latest code from git
# it should be run on the production server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"


# Check if --skip-pull flag is present
SKIP_PULL=false
USE_DEV=false
for arg in "$@"; do
    if [ "$arg" = "--skip-pull" ]; then
        SKIP_PULL=true
    fi

    if [ "$arg" = "--dev" ]; then
        USE_DEV=true
    fi
done

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed${NC}"
    exit 1
fi


# Pull latest code (unless --skip-pull flag is set)
if [ "$SKIP_PULL" = false ]; then
    echo -e "${YELLOW}Pulling latest code from git...${NC}"
    if git pull; then
        echo -e "${GREEN}✓ Code updated successfully${NC}"
        echo -e "${YELLOW}Restarting script with --skip-pull flag...${NC}"
        # Kill current process and restart script with --skip-pull
        exec "$0" --skip-pull
    else
        echo -e "${RED}✗ Failed to pull code from git${NC}"
        exit 1
    fi
fi


# Load environment variables from .env file if it exists
ENV_FILE="$SCRIPT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Loading environment variables from .env file...${NC}"
    # Export variables from .env file (handles comments and empty lines)
    set -a
    source "$ENV_FILE"
    set +a
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found at $ENV_FILE${NC}"
    echo -e "${YELLOW}   Make sure API_AUTH_USERNAME and API_AUTH_PASSWORD are set${NC}"
fi

echo -e "${GREEN}Starting deployment...${NC}"

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Set the docker compose file
COMPOSE_FILE="docker-compose.prod.yml"
if [ "$USE_DEV" = true ]; then
	COMPOSE_FILE="docker-compose.dev.yml"
fi

# Pre-generate OpenAPI spec and web API client before any service build/start
OPENAPI_SPEC_PATH="$SCRIPT_DIR/web/openapi/openapi.json"
echo -e "${YELLOW}Pre-generating OpenAPI spec and web API client...${NC}"
mkdir -p "$(dirname "$OPENAPI_SPEC_PATH")"

echo -e "${YELLOW}Generating OpenAPI spec from API source...${NC}"
if [ -f "$ENV_FILE" ]; then
    if docker run --rm \
        --env-file "$ENV_FILE" \
        -v "$SCRIPT_DIR:/workspace" \
        -w /workspace/api \
        node:24-alpine \
        sh -c "npm ci && npm run generate:openapi -- --output /workspace/web/openapi/openapi.json"; then
        echo -e "${GREEN}✓ OpenAPI spec generated${NC}"
    else
        echo -e "${RED}✗ Failed to generate OpenAPI spec${NC}"
        exit 1
    fi
else
    if docker run --rm \
        -v "$SCRIPT_DIR:/workspace" \
        -w /workspace/api \
        node:24-alpine \
        sh -c "npm ci && npm run generate:openapi -- --output /workspace/web/openapi/openapi.json"; then
        echo -e "${GREEN}✓ OpenAPI spec generated${NC}"
    else
        echo -e "${RED}✗ Failed to generate OpenAPI spec${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Generating web API client from local OpenAPI spec...${NC}"
if docker run --rm \
    -e OPENAPI_SPEC_FILE=/workspace/web/openapi/openapi.json \
    -v "$SCRIPT_DIR:/workspace" \
    -w /workspace/web \
    node:24-alpine \
    sh -c "npm ci && npm run generate:api"; then
    echo -e "${GREEN}✓ Web API client generated${NC}"
else
    echo -e "${RED}✗ Failed to generate web API client${NC}"
    exit 1
fi


# Build and start API first
echo -e "${YELLOW}Building and starting API container first...${NC}"
if $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d --build api; then
    echo -e "${GREEN}✓ API container started${NC}"
else
    echo -e "${RED}✗ Failed to start API container${NC}"
    exit 1
fi

# Wait for API to be ready (check health endpoint)
echo -e "${YELLOW}Waiting for API to be ready...${NC}"
API_READY=false
MAX_ATTEMPTS=30
ATTEMPT=0
API_NAME="pbsmon-api"
API_PORT=3000

if [ "$USE_DEV" = true ]; then
	API_NAME="pbsmon-api-dev"
	API_PORT=4000
fi

# Try to connect to API health endpoint
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "${YELLOW}Attempt $ATTEMPT/$MAX_ATTEMPTS: Checking API health...${NC}"
    
    # Check if API container is running
    if docker ps | grep -q $API_NAME; then
        # Try to hit the health endpoint inside the container
        if docker exec $API_NAME node -e "require('http').get(\"http://localhost:${API_PORT}/status\", (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>/dev/null; then
            API_READY=true
            echo -e "${GREEN}✓ API is ready${NC}"
            break
        fi
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        sleep 2
    fi
done

if [ "$API_READY" = false ]; then
    echo -e "${YELLOW}⚠️  API health check failed after $MAX_ATTEMPTS attempts${NC}"
    echo -e "${YELLOW}   Continuing anyway - web build will try to fetch OpenAPI spec${NC}"
fi

# Now build and start web service
echo -e "${YELLOW}Building and starting web container...${NC}"
if $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d --build web; then
    echo -e "${GREEN}✓ Web container started${NC}"
else
    echo -e "${RED}✗ Failed to start web container${NC}"
    exit 1
fi

# Wait a moment for containers to start
sleep 5

# Check container status
echo -e "${YELLOW}Checking container status...${NC}"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" ps

# Show logs for the last 20 lines
echo -e "${YELLOW}Recent logs:${NC}"
$DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=20

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Services should be available at:${NC}"
echo -e "  - Frontend: http://localhost"
echo -e "  - API: http://localhost/api"
echo -e "  - Swagger: http://localhost/api/docs"
