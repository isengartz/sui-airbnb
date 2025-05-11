#!/bin/sh

echo "Waiting for PostgreSQL to be ready..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "PostgreSQL is ready!"

# Check if migrations exist
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations)" ]; then
  echo "No migrations found. Creating initial migration..."
  npx prisma migrate dev --name init
else
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
fi

echo "Generating Prisma client..."
npx prisma generate

echo "Starting the application..."
npm run dev 