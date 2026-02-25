-- Observations migration: add Observation and ObservationSignal tables.

CREATE TABLE IF NOT EXISTS "Observation" (
    "id"                TEXT NOT NULL,
    "tenantId"          TEXT NOT NULL,
    "observedTeacherId" TEXT NOT NULL,
    "observerId"        TEXT NOT NULL,
    "observedAt"        TIMESTAMP(3) NOT NULL,
    "yearGroup"         TEXT NOT NULL,
    "subject"           TEXT NOT NULL,
    "classCode"         TEXT,
    "phase"             TEXT NOT NULL DEFAULT 'UNKNOWN',
    "contextNote"       TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ObservationSignal" (
    "id"            TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "signalKey"     TEXT NOT NULL,
    "valueKey"      TEXT,
    "notObserved"   BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ObservationSignal_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Observation_tenantId_observedAt_idx"
    ON "Observation"("tenantId", "observedAt");

CREATE INDEX IF NOT EXISTS "Observation_tenantId_observedTeacherId_observedAt_idx"
    ON "Observation"("tenantId", "observedTeacherId", "observedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ObservationSignal_observationId_signalKey_key"
    ON "ObservationSignal"("observationId", "signalKey");

-- Foreign keys
ALTER TABLE "Observation"
    ADD CONSTRAINT "Observation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Observation"
    ADD CONSTRAINT "Observation_observedTeacherId_fkey"
    FOREIGN KEY ("observedTeacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Observation"
    ADD CONSTRAINT "Observation_observerId_fkey"
    FOREIGN KEY ("observerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ObservationSignal"
    ADD CONSTRAINT "ObservationSignal_observationId_fkey"
    FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
