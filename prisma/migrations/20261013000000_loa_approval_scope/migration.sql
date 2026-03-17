-- CreateTable: LOAApprovalScope
-- Allows scoped LOA approval: a specific approver can approve leave for specific staff only.
CREATE TABLE IF NOT EXISTS "LOAApprovalScope" (
    "id"           TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "approverId"   TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    CONSTRAINT "LOAApprovalScope_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LOAApprovalScope_tenantId_approverId_targetUserId_key"
    ON "LOAApprovalScope"("tenantId", "approverId", "targetUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LOAApprovalScope_tenantId_idx" ON "LOAApprovalScope"("tenantId");

-- AddForeignKey
ALTER TABLE "LOAApprovalScope" ADD CONSTRAINT "LOAApprovalScope_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LOAApprovalScope" ADD CONSTRAINT "LOAApprovalScope_approver_fkey"
    FOREIGN KEY ("tenantId", "approverId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LOAApprovalScope" ADD CONSTRAINT "LOAApprovalScope_target_fkey"
    FOREIGN KEY ("tenantId", "targetUserId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
