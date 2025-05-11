# SUI Airbnb Indexer

This service indexes events from the SUI blockchain and stores them in a PostgreSQL database for fast querying.

## Prerequisites

- Node.js >= 18.18.0
- PostgreSQL database
- Docker (optional, for containerized development)

## Standalone Setup

### 1. Install Node.js 18 or later

```bash
# Using NVM (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
nvm install 18.18.0
nvm use 18.18.0

# Verify installation
node -v  # Should show v18.18.0 or later
```

### 2. Set up PostgreSQL

You can either:

- Run PostgreSQL locally if you have it installed
- Use the provided script to start PostgreSQL in Docker:

```bash
chmod +x setup-db.sh
./setup-db.sh
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment

Edit the `.env` file to match your environment.

### 5. Set up the database

```bash
# Generate Prisma client and run migrations
npm run db:setup
```

### 6. Start the indexer

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## Using with Docker Compose

If you prefer to use Docker for the entire stack:

```bash
# From the project root
docker-compose up indexer
```

## API Endpoints

- `GET /health` - Check if the service is running
- `GET /properties` - Get all properties
- `POST /properties/mock` - Create a mock property (for testing)

## Development Tips

1. Use Prisma Studio to explore your database:
   ```bash
   npm run prisma:studio
   ```

2. If you make changes to the Prisma schema, run:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

3. View logs in development mode:
   ```bash
   # Standalone
   npm run dev
   
   # Docker
   docker-compose logs -f indexer
   ```