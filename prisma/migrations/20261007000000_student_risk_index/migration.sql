-- CreateEnum
CREATE TYPE "AnalysisRunType" AS ENUM ('STUDENT_RISK');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable: StudentWatchlist
CREATE TABLE "StudentWatchlist" (
    "id"                TEXT NOT NULL,
    "tenantId"          TEXT NOT NULL,
    "studentId"         TEXT NOT NULL,
    "createdByUserId"   TEXT NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentWatchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AnalysisRun
CREATE TABLE "AnalysisRun" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "type"          "AnalysisRunType" NOT NULL,
    "windowDays"    INTEGER NOT NULL,
    "status"        "AnalysisRunStatus" NOT NULL DEFAULT 'PENDING',
    "computedAt"    TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "StudentWatchlist_tenantId_studentId_createdByUserId_key"
    ON "StudentWatchlist"("tenantId", "studentId", "createdByUserId");

-- Indexes
CREATE INDEX "StudentWatchlist_tenantId_studentId_idx"
    ON "StudentWatchlist"("tenantId", "studentId");

CREATE INDEX "AnalysisRun_tenantId_type_computedAt_idx"
    ON "AnalysisRun"("tenantId", "type", "computedAt");

-- Foreign keys
ALTER TABLE "StudentWatchlist"
    ADD CONSTRAINT "StudentWatchlist_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentWatchlist"
    ADD CONSTRAINT "StudentWatchlist_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentWatchlist"
    ADD CONSTRAINT "StudentWatchlist_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalysisRun"
    ADD CONSTRAINT "AnalysisRun_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
