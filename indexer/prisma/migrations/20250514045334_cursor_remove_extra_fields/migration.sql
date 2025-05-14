/*
  Warnings:

  - You are about to drop the column `errorCount` on the `EventCursor` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `EventCursor` table. All the data in the column will be lost.
  - You are about to drop the column `processedCount` on the `EventCursor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventCursor" DROP COLUMN "errorCount",
DROP COLUMN "isActive",
DROP COLUMN "processedCount";
