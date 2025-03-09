/*
  Warnings:

  - You are about to drop the column `timezone` on the `Reminder` table. All the data in the column will be lost.
  - The `recurrence_time` column on the `Reminder` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "timezone",
DROP COLUMN "recurrence_time",
ADD COLUMN     "recurrence_time" TIME;
