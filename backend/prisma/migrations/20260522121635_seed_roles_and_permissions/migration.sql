-- Migration: seed_roles_and_permissions

-- 1. Insert permissions
INSERT INTO users.permissions (code, description) VALUES
  ('inventory:write', 'Create and update inventory items, categories, locations and transactions'),
  ('bookings:write', 'Create and manage booking resources'),
  ('bookings:approve', 'Approve or reject reservation requests'),
  ('bookings:override', 'Override booking conflict restrictions')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert admin role
INSERT INTO users.roles (name, description, priority) VALUES
  ('admin', 'Full system access', 100)
ON CONFLICT (name) DO NOTHING;

-- 3. Wire all permissions to admin role
INSERT INTO users.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM users.roles r
CROSS JOIN users.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;