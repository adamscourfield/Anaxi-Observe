-- Admin Foundation Migration: departments, coaching, leave-approval groups,
-- tenant settings, timetable, and HOD role.

-- Add HOD value to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'HOD';

-- Add LeaveApprovalGroupAppliesTo enum
DO $$ BEGIN
  CREATE TYPE "LeaveApprovalGroupAppliesTo" AS ENUM ('ALL_STAFF', 'SELECTED_MEMBERS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Department
CREATE TABLE IF NOT EXISTS "Department" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Department_tenantId_name_key" ON "Department"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Department_tenantId_idx" ON "Department"("tenantId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DepartmentMembership
CREATE TABLE IF NOT EXISTS "DepartmentMembership" (
    "id"                 TEXT NOT NULL,
    "tenantId"           TEXT NOT NULL,
    "departmentId"       TEXT NOT NULL,
    "userId"             TEXT NOT NULL,
    "isHeadOfDepartment" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DepartmentMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentMembership_departmentId_userId_key" ON "DepartmentMembership"("departmentId", "userId");
CREATE INDEX IF NOT EXISTS "DepartmentMembership_tenantId_departmentId_idx" ON "DepartmentMembership"("tenantId", "departmentId");
ALTER TABLE "DepartmentMembership" ADD CONSTRAINT "DepartmentMembership_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentMembership" ADD CONSTRAINT "DepartmentMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CoachAssignment
CREATE TABLE IF NOT EXISTS "CoachAssignment" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "coachUserId"   TEXT NOT NULL,
    "coacheeUserId" TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CoachAssignment_tenantId_coachUserId_coacheeUserId_key" ON "CoachAssignment"("tenantId", "coachUserId", "coacheeUserId");
CREATE INDEX IF NOT EXISTS "CoachAssignment_tenantId_coachUserId_idx" ON "CoachAssignment"("tenantId", "coachUserId");
ALTER TABLE "CoachAssignment" ADD CONSTRAINT "CoachAssignment_coachUserId_fkey"
    FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachAssignment" ADD CONSTRAINT "CoachAssignment_coacheeUserId_fkey"
    FOREIGN KEY ("coacheeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LeaveApprovalGroup
CREATE TABLE IF NOT EXISTS "LeaveApprovalGroup" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "appliesTo" "LeaveApprovalGroupAppliesTo" NOT NULL DEFAULT 'ALL_STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveApprovalGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LeaveApprovalGroup_tenantId_idx" ON "LeaveApprovalGroup"("tenantId");

-- LeaveApprovalGroupMember
CREATE TABLE IF NOT EXISTS "LeaveApprovalGroupMember" (
    "id"             TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "groupId"        TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    CONSTRAINT "LeaveApprovalGroupMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveApprovalGroupMember_groupId_approverUserId_key" ON "LeaveApprovalGroupMember"("groupId", "approverUserId");
CREATE INDEX IF NOT EXISTS "LeaveApprovalGroupMember_tenantId_idx" ON "LeaveApprovalGroupMember"("tenantId");
ALTER TABLE "LeaveApprovalGroupMember" ADD CONSTRAINT "LeaveApprovalGroupMember_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "LeaveApprovalGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveApprovalGroupMember" ADD CONSTRAINT "LeaveApprovalGroupMember_approverUserId_fkey"
    FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LeaveApprovalGroupScope
CREATE TABLE IF NOT EXISTS "LeaveApprovalGroupScope" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "groupId"       TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    CONSTRAINT "LeaveApprovalGroupScope_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveApprovalGroupScope_groupId_subjectUserId_key" ON "LeaveApprovalGroupScope"("groupId", "subjectUserId");
CREATE INDEX IF NOT EXISTS "LeaveApprovalGroupScope_tenantId_idx" ON "LeaveApprovalGroupScope"("tenantId");
ALTER TABLE "LeaveApprovalGroupScope" ADD CONSTRAINT "LeaveApprovalGroupScope_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "LeaveApprovalGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveApprovalGroupScope" ADD CONSTRAINT "LeaveApprovalGroupScope_subjectUserId_fkey"
    FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TenantSettings
CREATE TABLE IF NOT EXISTS "TenantSettings" (
    "id"                       TEXT NOT NULL,
    "tenantId"                 TEXT NOT NULL,
    "schoolName"               TEXT,
    "timezone"                 TEXT NOT NULL DEFAULT 'Europe/London',
    "defaultInsightWindowDays" INTEGER NOT NULL DEFAULT 21,
    "positivePointsLabel"      TEXT NOT NULL DEFAULT 'Positive Points',
    "detentionLabel"           TEXT NOT NULL DEFAULT 'Detention',
    "internalExclusionLabel"   TEXT NOT NULL DEFAULT 'Internal Exclusion',
    "suspensionLabel"          TEXT NOT NULL DEFAULT 'Suspension',
    "onCallLabel"              TEXT NOT NULL DEFAULT 'On Call',
    "driftDeltaThreshold"      DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "minObservationCount"      INTEGER NOT NULL DEFAULT 3,
    "behaviourSpikePercent"    DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "onboardingCompletedAt"    TIMESTAMP(3),
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- TimetableEntry
CREATE TABLE IF NOT EXISTS "TimetableEntry" (
    "id"              TEXT NOT NULL,
    "tenantId"        TEXT NOT NULL,
    "classCode"       TEXT NOT NULL,
    "subject"         TEXT NOT NULL,
    "yearGroup"       TEXT NOT NULL,
    "teacherUserId"   TEXT,
    "teacherEmailRaw" TEXT,
    "room"            TEXT,
    "dayOfWeek"       INTEGER,
    "period"          TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TimetableEntry_tenantId_yearGroup_subject_classCode_idx" ON "TimetableEntry"("tenantId", "yearGroup", "subject", "classCode");
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teacherUserId_fkey"
    FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TimetableImportJob
CREATE TABLE IF NOT EXISTS "TimetableImportJob" (
    "id"               TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedByUserId" TEXT NOT NULL,
    "fileName"         TEXT NOT NULL,
    "rowCount"         INTEGER NOT NULL DEFAULT 0,
    "rowsProcessed"    INTEGER NOT NULL DEFAULT 0,
    "rowsFailed"       INTEGER NOT NULL DEFAULT 0,
    "errorReportJson"  JSONB,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"       TIMESTAMP(3),
    CONSTRAINT "TimetableImportJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TimetableImportJob_tenantId_createdAt_idx" ON "TimetableImportJob"("tenantId", "createdAt");
ALTER TABLE "TimetableImportJob" ADD CONSTRAINT "TimetableImportJob_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON UPDATE CASCADE;
