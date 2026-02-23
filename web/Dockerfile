# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Accept API_BASE_URL and auth credentials as build arguments
ARG API_BASE_URL
ARG API_AUTH_USERNAME
ARG API_AUTH_PASSWORD
ENV API_BASE_URL=${API_BASE_URL}
ENV API_AUTH_USERNAME=${API_AUTH_USERNAME}
ENV API_AUTH_PASSWORD=${API_AUTH_PASSWORD}
ENV OPENAPI_SPEC_FILE=/app/openapi/openapi.json

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Install wget for health checks
RUN apk add --no-cache wget

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript; \
    \
    # SPA routing - serve index.html for all routes \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

