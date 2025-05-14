/*
  Warnings:

  - Made the column `eventSeq` on table `EventCursor` required. This step will fail if there are existing NULL values in that column.
  - Made the column `txDigest` on table `EventCursor` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EventCursor" ALTER COLUMN "eventSeq" SET NOT NULL,
ALTER COLUMN "txDigest" SET NOT NULL;
