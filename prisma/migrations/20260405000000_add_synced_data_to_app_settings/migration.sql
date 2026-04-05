-- AlterTable: add persisted sync data columns to AppSettings
ALTER TABLE "public"."AppSettings"
  ADD COLUMN IF NOT EXISTS "syncedUsers"    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "syncedStatuses" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "syncedLabels"   JSONB NOT NULL DEFAULT '[]';
