/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `ConversationContext` will be added. If there are existing duplicate values, this will fail.
  - Made the column `title` on table `Reminder` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Reminder" ALTER COLUMN "title" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ConversationContext_userId_key" ON "ConversationContext"("userId");
