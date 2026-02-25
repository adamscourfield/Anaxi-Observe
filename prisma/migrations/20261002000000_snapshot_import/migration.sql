-- Add CountScope enum
CREATE TYPE "CountScope" AS ENUM ('ROLLING_21_DAYS', 'ROLLING_28_DAYS', 'TERM_TO_DATE', 'YEAR_TO_DATE');

-- Add countScope column to StudentSnapshot
ALTER TABLE "StudentSnapshot" ADD COLUMN "countScope" "CountScope" NOT NULL DEFAULT 'TERM_TO_DATE';

-- Extend ImportJob with tracking fields
ALTER TABLE "ImportJob" ADD COLUMN "rowsProcessed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ImportJob" ADD COLUMN "rowsFailed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ImportJob" ADD COLUMN "errorReportJson" JSONB;
ALTER TABLE "ImportJob" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "ImportJob" ADD COLUMN "finishedAt" TIMESTAMP(3);

-- Add index on ImportJob(tenantId, createdAt)
CREATE INDEX "ImportJob_tenantId_createdAt_idx" ON "ImportJob"("tenantId", "createdAt");

-- Create TenantImportMapping table
CREATE TABLE "TenantImportMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ImportJobType" NOT NULL,
    "name" TEXT NOT NULL,
    "mappingJson" JSONB NOT NULL,
    "fixedCountScope" "CountScope",
    "headerSignature" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantImportMapping_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for TenantImportMapping
ALTER TABLE "TenantImportMapping" ADD CONSTRAINT "TenantImportMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantImportMapping" ADD CONSTRAINT "TenantImportMapping_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes for TenantImportMapping
CREATE INDEX "TenantImportMapping_tenantId_type_idx" ON "TenantImportMapping"("tenantId", "type");
CREATE INDEX "TenantImportMapping_headerSignature_idx" ON "TenantImportMapping"("headerSignature");
