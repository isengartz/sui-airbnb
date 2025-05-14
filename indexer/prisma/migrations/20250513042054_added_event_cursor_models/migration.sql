/*
  Warnings:

  - You are about to drop the column `address` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `Property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Property" DROP COLUMN "address",
DROP COLUMN "description",
DROP COLUMN "isAvailable";

-- CreateTable
CREATE TABLE "EventCursor" (
    "id" TEXT NOT NULL,
    "cursor" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EventCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRetryAt" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FailedEvent_pkey" PRIMARY KEY ("id")
);
