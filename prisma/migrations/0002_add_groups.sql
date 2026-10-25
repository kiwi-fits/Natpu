-- Migration: Add multi-group support
-- Each group has its own admin, members, meetings, settlements, and bank details

-- 1. Create groups table
CREATE TABLE IF NOT EXISTS "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "groups_slug_key" ON "groups"("slug");

-- 2. Create default group for existing data
INSERT OR IGNORE INTO "groups" ("id", "name", "slug", "password", "createdAt", "updatedAt")
VALUES ('default-natpu-group', 'Natpu', 'natpu', '123456789Natpu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Add groupId to users
ALTER TABLE "users" ADD COLUMN "groupId" TEXT REFERENCES "groups"("id");
UPDATE "users" SET "groupId" = 'default-natpu-group';

-- 4. Add groupId to meetings
ALTER TABLE "meetings" ADD COLUMN "groupId" TEXT REFERENCES "groups"("id");
UPDATE "meetings" SET "groupId" = 'default-natpu-group';

-- 5. Add groupId to bank_details
ALTER TABLE "bank_details" ADD COLUMN "groupId" TEXT REFERENCES "groups"("id");
UPDATE "bank_details" SET "groupId" = 'default-natpu-group';

-- 6. Add groupId to audit_logs
ALTER TABLE "audit_logs" ADD COLUMN "groupId" TEXT REFERENCES "groups"("id");
UPDATE "audit_logs" SET "groupId" = 'default-natpu-group';
