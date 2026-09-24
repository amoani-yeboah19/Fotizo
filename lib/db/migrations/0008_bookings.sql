-- Additive migration: service booking requests. A customer requests a package
-- at a date and time; the provider confirms or declines. Payment is arranged
-- offline, like orders.
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  provider_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Snapshot of what was requested, so later listing edits cannot rewrite it.
  service_title text NOT NULL,
  package_name text NOT NULL,
  package_price numeric(10, 2) NOT NULL,
  scheduled_for timestamptz NOT NULL,
  timezone text NOT NULL,
  notes text NOT NULL DEFAULT '' CONSTRAINT bookings_notes_valid CHECK (char_length(notes) <= 2000),
  status text NOT NULL DEFAULT 'requested' CONSTRAINT bookings_status_valid
    CHECK (status IN ('requested', 'confirmed', 'declined', 'cancelled', 'completed')),
  status_version integer NOT NULL DEFAULT 0,
  provider_note text NOT NULL DEFAULT '' CONSTRAINT bookings_provider_note_valid CHECK (char_length(provider_note) <= 1000),
  meeting_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_buyer_scheduled_idx ON bookings(buyer_id, scheduled_for);
CREATE INDEX IF NOT EXISTS bookings_provider_scheduled_idx ON bookings(provider_id, scheduled_for);
-- One open request per customer, service and time.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_open_request_idx ON bookings(buyer_id, service_id, scheduled_for)
  WHERE status IN ('requested', 'confirmed');
