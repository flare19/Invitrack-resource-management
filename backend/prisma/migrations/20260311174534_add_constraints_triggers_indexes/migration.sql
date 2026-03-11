-- This is an empty migration.

-- set_updated_at trigger function (defined once, shared across all modules)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auth triggers
CREATE TRIGGER set_updated_at_auth_accounts
  BEFORE UPDATE ON auth.accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Users triggers
CREATE TRIGGER set_updated_at_users_profiles
  BEFORE UPDATE ON users.profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Inventory triggers
CREATE TRIGGER set_updated_at_inventory_items
  BEFORE UPDATE ON inventory.items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_inventory_stock_levels
  BEFORE UPDATE ON inventory.stock_levels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Bookings triggers
CREATE TRIGGER set_updated_at_bookings_reservations
  BEFORE UPDATE ON bookings.reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CHECK constraints
ALTER TABLE inventory.stock_levels
  ADD CONSTRAINT chk_stock_quantity_non_negative CHECK (quantity >= 0);

ALTER TABLE bookings.resources
  ADD CONSTRAINT chk_resource_quantity_positive CHECK (quantity > 0);

ALTER TABLE bookings.reservations
  ADD CONSTRAINT chk_reservation_quantity_positive CHECK (quantity > 0);

ALTER TABLE bookings.reservations
  ADD CONSTRAINT chk_reservation_time_range CHECK (end_time > start_time);

-- Partial index for booking overlap prevention
CREATE INDEX idx_reservations_overlap
  ON bookings.reservations (resource_id, start_time, end_time)
  WHERE status IN ('pending', 'approved');