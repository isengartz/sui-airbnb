/*
  Warnings:

  - You are about to drop the column `cursor` on the `EventCursor` table. All the data in the column will be lost.
  - Added the required column `eventSeq` to the `EventCursor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `txDigest` to the `EventCursor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventCursor" DROP COLUMN "cursor",
ADD COLUMN     "eventSeq" TEXT NOT NULL,
ADD COLUMN     "txDigest" TEXT NOT NULL;
