# Deployment Guide

## Purpose

This document provides instructions for deploying the PBSMon web application.

## Prerequisites

- Docker
- Kerberos
- Running on Debian 13

## Configuration

- run in root dir of project

```sh
cp .env.prod.example .env
```

- then fill in the missing enviroment variables

**⚠️ Security Warning**: These environment variables represents sensitive information and must be transferred through a **secure channel**.

## Deploying

to deploy:

```sh
./deploy.sh
```

`deploy.sh` now performs a pre-build OpenAPI preparation phase before building any service:

1. Generate OpenAPI JSON from API source code (`api/src/scripts/generate-openapi.ts`) into `web/openapi/openapi.json`
2. Generate frontend API client from that local spec (`web/scripts/generate-api-client.js`)
3. Build/start containers with Docker Compose

This removes the previous dependency where frontend build needed a running API container to fetch `/docs-json`.

In case of need to restart nginx, run

```sh
sudo docker compose -f docker-compose.prod.yml restart -d nginx
```

TODO:

- make deploy.sh great again - it needs to work
- add configuration for nginx to .env, dont hardcode it
- how to make a new PBS machines works and to be configured
