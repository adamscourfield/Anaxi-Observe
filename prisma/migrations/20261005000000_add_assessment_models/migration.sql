-- AlterEnum
ALTER TYPE "ImportJobType" ADD VALUE 'ASSESSMENT_RESULTS';

-- AlterEnum
ALTER TYPE "InsightType" ADD VALUE 'ATTAINMENT_CONCERN';
ALTER TYPE "InsightType" ADD VALUE 'PROGRESS_DROP';
ALTER TYPE "InsightType" ADD VALUE 'COMBINED_METRIC_ALERT';
ALTER TYPE "InsightType" ADD VALUE 'ATTAINMENT_RISK_TRIANGULATION';

-- AlterEnum
ALTER TYPE "AnalysisRunType" ADD VALUE 'ASSESSMENT_ANALYSIS';

-- CreateEnum
CREATE TYPE "GradeFormat" AS ENUM ('GCSE', 'A_LEVEL', 'PERCENTAGE', 'RAW');

-- CreateEnum
CREATE TYPE "AssessmentResultStatus" AS ENUM ('PRESENT', 'ABSENT', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "AssessmentCycle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "yearGroup" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeFormat" "GradeFormat" NOT NULL,
    "maxScore" INTEGER,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "normalizedScore" DOUBLE PRECISION,
    "status" "AssessmentResultStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubTopic" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "learnTopicId" TEXT,

    CONSTRAINT "SubTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSubTopicMapping" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "subTopicId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "AssessmentSubTopicMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSubTopicScore" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "subTopicId" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "normalizedScore" DOUBLE PRECISION,

    CONSTRAINT "AssessmentSubTopicScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttainmentMetricPreset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rulesJson" JSONB NOT NULL,
    "logic" TEXT NOT NULL DEFAULT 'AND',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttainmentMetricPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentCycle_tenantId_label_key" ON "AssessmentCycle"("tenantId", "label");
CREATE INDEX "AssessmentCycle_tenantId_idx" ON "AssessmentCycle"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentPoint_tenantId_cycleId_label_key" ON "AssessmentPoint"("tenantId", "cycleId", "label");
CREATE INDEX "AssessmentPoint_tenantId_cycleId_idx" ON "AssessmentPoint"("tenantId", "cycleId");

-- CreateIndex
CREATE INDEX "Assessment_tenantId_pointId_idx" ON "Assessment"("tenantId", "pointId");
CREATE INDEX "Assessment_tenantId_subject_yearGroup_idx" ON "Assessment"("tenantId", "subject", "yearGroup");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResult_tenantId_assessmentId_studentId_key" ON "AssessmentResult"("tenantId", "assessmentId", "studentId");
CREATE INDEX "AssessmentResult_tenantId_assessmentId_idx" ON "AssessmentResult"("tenantId", "assessmentId");
CREATE INDEX "AssessmentResult_tenantId_studentId_idx" ON "AssessmentResult"("tenantId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubTopic_tenantId_subject_label_key" ON "SubTopic"("tenantId", "subject", "label");
CREATE INDEX "SubTopic_tenantId_subject_idx" ON "SubTopic"("tenantId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSubTopicMapping_assessmentId_subTopicId_key" ON "AssessmentSubTopicMapping"("assessmentId", "subTopicId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSubTopicScore_resultId_subTopicId_key" ON "AssessmentSubTopicScore"("resultId", "subTopicId");

-- CreateIndex
CREATE UNIQUE INDEX "AttainmentMetricPreset_tenantId_name_key" ON "AttainmentMetricPreset"("tenantId", "name");
CREATE INDEX "AttainmentMetricPreset_tenantId_idx" ON "AttainmentMetricPreset"("tenantId");

-- AddForeignKey
ALTER TABLE "AssessmentCycle" ADD CONSTRAINT "AssessmentCycle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentPoint" ADD CONSTRAINT "AssessmentPoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentPoint" ADD CONSTRAINT "AssessmentPoint_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AssessmentCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "AssessmentPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTopic" ADD CONSTRAINT "SubTopic_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubTopicMapping" ADD CONSTRAINT "AssessmentSubTopicMapping_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubTopicMapping" ADD CONSTRAINT "AssessmentSubTopicMapping_subTopicId_fkey" FOREIGN KEY ("subTopicId") REFERENCES "SubTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubTopicScore" ADD CONSTRAINT "AssessmentSubTopicScore_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AssessmentResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubTopicScore" ADD CONSTRAINT "AssessmentSubTopicScore_subTopicId_fkey" FOREIGN KEY ("subTopicId") REFERENCES "SubTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttainmentMetricPreset" ADD CONSTRAINT "AttainmentMetricPreset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
