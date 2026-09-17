-- Seed Admin user
INSERT OR REPLACE INTO "users" ("id", "name", "email", "role", "status", "createdAt", "updatedAt")
VALUES ('admin_root_001', 'Admin', 'admin@splitmeet.local', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed Bank Details
INSERT OR REPLACE INTO "bank_details" ("id", "bankName", "accountName", "accountNumber", "branch", "createdAt", "updatedAt")
VALUES ('bank_default_001', 'Commercial Bank', 'Natpu Admin', '1234567890', 'Main Branch', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed Members
INSERT OR REPLACE INTO "users" ("id", "name", "email", "role", "status", "createdAt", "updatedAt")
VALUES 
  ('member_ajith_002', 'Ajith', 'ajith.235ty@splitmeet.local', 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('member_thanu_003', 'Thanu', 'thanu.q64ga@splitmeet.local', 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('member_regin_004', 'Regin', 'regin.jwfxd@splitmeet.local', 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
