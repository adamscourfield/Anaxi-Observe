-- CreateTable
CREATE TABLE "StrategyArea" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "category"    TEXT,
  "description" TEXT,
  "priority"    TEXT NOT NULL DEFAULT 'medium',
  "owner"       TEXT,
  "completed"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL,

  CONSTRAINT "StrategyArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyNote" (
  "id"             TEXT NOT NULL,
  "strategyAreaId" TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "text"           TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById"    TEXT NOT NULL,

  CONSTRAINT "StrategyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrategyArea_tenantId_idx" ON "StrategyArea"("tenantId");

-- CreateIndex
CREATE INDEX "StrategyArea_tenantId_completed_idx" ON "StrategyArea"("tenantId", "completed");

-- CreateIndex
CREATE INDEX "StrategyNote_strategyAreaId_idx" ON "StrategyNote"("strategyAreaId");

-- AddForeignKey
ALTER TABLE "StrategyArea"
  ADD CONSTRAINT "StrategyArea_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyNote"
  ADD CONSTRAINT "StrategyNote_strategyAreaId_fkey"
  FOREIGN KEY ("strategyAreaId") REFERENCES "StrategyArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyNote"
  ADD CONSTRAINT "StrategyNote_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
