DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM settlements;
DELETE FROM expenses;
DELETE FROM meeting_attendees;
DELETE FROM meetings;
DELETE FROM bank_details;
DELETE FROM users;

-- Keep only the single clean Admin user
INSERT INTO users (id, name, email, role, status, createdAt, updatedAt)
VALUES (
  'admin_root_001',
  'Admin',
  'admin@splitmeet.local',
  'ADMIN',
  'ACTIVE',
  datetime('now'),
  datetime('now')
);
