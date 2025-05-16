# SUI Airbnb Backend Service

This is the backend service for the SUI Airbnb application that provides API endpoints for property management.

## Features

- RESTful API for property management
- Connection to the same database as the indexer
- Health check endpoint
- TypeScript/Express implementation

## Endpoints

- `GET /health` - Health check endpoint
- `GET /properties` - Get all properties
- `POST /properties/mock` - Create a mock property

## Development

### Prerequisites

- Node.js
- npm
- Docker (optional, for running with docker-compose)

### Setup

1. Install dependencies

```bash
npm install
```

2. Set up environment variables (copy from .env.example)

```bash
cp .env.example .env
```

3. Generate Prisma client

```bash
npm run prisma:generate
```

### Running the service

```bash
npm run dev
```

### Build for production

```bash
npm run build
npm start
```

## Docker

The service can be run as part of the docker-compose setup:

```bash
docker-compose up backend
``` 