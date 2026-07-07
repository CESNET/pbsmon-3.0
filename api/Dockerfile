# Build stage for Node.js application
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Note: pbscaller is now a separate service in docker-compose.prod.yml

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Note: pbscaller is a separate service, no need to include it here

# Create data directory for perun data
RUN mkdir -p /app/data/perun /app/data/pbs

# Expose port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# jobs.json can be very large once streamed and parsed into memory (see
# PbsCollectionService); Node's default old-space heap ceiling (~1.9GB) is
# too low for that, so raise it. Override via the NODE_OPTIONS env var if a
# deployment needs more.
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Start the application
CMD ["node", "dist/main"]

