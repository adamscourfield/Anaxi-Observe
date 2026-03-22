-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "status" "MeetingStatus" NOT NULL DEFAULT 'PENDING';
