-- DropIndex
DROP INDEX "ConversationContext_expiresAt_idx";

-- DropIndex
DROP INDEX "ConversationContext_userId_idx";

-- AlterTable
ALTER TABLE "ConversationContext" ALTER COLUMN "messages" SET DEFAULT ARRAY[]::JSONB[];

-- AlterTable
ALTER TABLE "Reminder" ALTER COLUMN "title" DROP NOT NULL;
