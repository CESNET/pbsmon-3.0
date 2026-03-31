# pbsmon-3.0

Metacentrum PBSMon - Monitoring and management system for PBS (Portable Batch System) clusters and OpenStack entities

## Prerequisites

- **Docker** - Required for running the application in containers
- **Docker Compose** - Usually included with Docker Desktop

## Installation & Setup (locally)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pbsmon-3.0
```

### 2. Environment Configuration

Most of environment variables are configured directly in `docker-compose.dev.yml`, so **no `.env` files are required** for basic development setup.

#### Prometheus Configuration (Optional)

If you need to connect to Prometheus in development, create an `api/.env` file with the Prometheus credentials:

```bash
cp api/env-dev.example api/.env
```

Then edit `api/.env` and configure the listed variables. (these credentials are confidential and must be transferred through a **secure channel**s)

The `docker-compose.dev.yml` will automatically read these variables from `api/.env` and pass them to the API container.

### 3. Mock Data Setup

In development, it is not possible to collect data from PBS and PERUN:

- **PBS data collection** requires specific infrastructure and authentication that is not available in the development environment
- **PERUN data** uses a PUSH mechanism, so it cannot be collected directly in development

Therefore, mock data must be provided in the following directories:

- `api/data/pbs/<serverName>/` - Mock PBS data for the specified server (e.g., `api/data/pbs/pbs-m1/`)
- `api/data/perun/` - Mock PERUN data

**⚠️ Security Warning**: These mock data files contain sensitive information and must be transferred through a **secure channel** . Do not commit sensitive mock data to version control.

Example directory structure:

```
api/data/
├── pbs/
│   └── pbs-m1/
│       └── (mock PBS data files)
└── perun/
    └── (mock PERUN data files)
```

### 4. Start Development Environment

Start the development services using Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up
```

Or run in detached mode:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This will start:

- **API** service on port 4000
- **Web** service on port 5173 (Vite dev server)

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **API**: http://localhost:4000
- **API Swagger Documentation**: http://localhost:4000/docs (if available)

### 6. Stop the Services

To stop the development services:

```bash
docker compose -f docker-compose.dev.yml down
```

## Development Notes

- The development docker-compose file (`docker-compose.dev.yml`) only includes the **API** and **Web** services
- **Nginx** and **pbs-collector** services are not included in the development setup
- Source code is mounted as volumes for hot-reload during development
- Changes to source files will automatically trigger rebuilds/reloads
- **Mock data is required** for development - see [Mock Data Setup](#3-mock-data-setup) section above
- `MOCK_PBS_DATA=true` is already configured in `docker-compose.dev.yml` to enable mock data usage

## Production Deployment

For production deployment, use `docker-compose.prod.yml` which includes all services (API, Web, Nginx, and pbs-collector).
