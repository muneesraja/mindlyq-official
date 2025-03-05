-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "recurrence_time" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Etc/UTC';
