-- Additive migration: customer-support cases, the vehicle catalogue, vehicle
-- enquiries and the staff history of every case status change.
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  topic text NOT NULL CONSTRAINT support_requests_topic_valid
    CHECK (topic IN ('not-received', 'damaged', 'refund', 'vehicle', 'service', 'account', 'other')),
  order_ref text NOT NULL DEFAULT '',
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CONSTRAINT support_requests_status_valid
    CHECK (status IN ('open', 'in_progress', 'resolved')),
  status_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_requests_status_created_idx ON support_requests(status, created_at, id);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CONSTRAINT vehicles_slug_valid CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  make text NOT NULL,
  model text NOT NULL,
  body_type text NOT NULL CONSTRAINT vehicles_body_type_valid
    CHECK (body_type IN ('suv', 'coupe-suv', 'sedan', 'pickup')),
  fuel text NOT NULL CONSTRAINT vehicles_fuel_valid CHECK (fuel IN ('petrol', 'hybrid', 'electric')),
  seats integer NOT NULL CONSTRAINT vehicles_seats_valid CHECK (seats BETWEEN 1 AND 60),
  transmission text NOT NULL,
  drivetrain text NOT NULL,
  powertrain text NOT NULL,
  efficiency text NOT NULL,
  landed_price numeric(12, 2) NOT NULL CONSTRAINT vehicles_price_valid CHECK (landed_price > 0),
  lead_time_min_weeks integer NOT NULL,
  lead_time_max_weeks integer NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  highlights text[] NOT NULL DEFAULT '{}',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active' CONSTRAINT vehicles_status_valid CHECK (status IN ('active', 'unpublished')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicles_lead_time_valid CHECK (lead_time_min_weeks > 0 AND lead_time_max_weeks >= lead_time_min_weeks)
);
CREATE INDEX IF NOT EXISTS vehicles_status_price_idx ON vehicles(status, landed_price);

CREATE TABLE IF NOT EXISTS vehicle_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  -- Snapshot of what the customer saw, so later catalogue edits cannot rewrite the lead.
  vehicle_name text NOT NULL,
  quoted_landed_price numeric(12, 2) NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  destination text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CONSTRAINT vehicle_enquiries_status_valid
    CHECK (status IN ('new', 'contacted', 'quoted', 'closed')),
  status_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_enquiries_status_created_idx ON vehicle_enquiries(status, created_at, id);

-- Status changes and their case record commit together.
CREATE TABLE IF NOT EXISTS case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type text NOT NULL CONSTRAINT case_events_type_valid CHECK (case_type IN ('support', 'vehicle_enquiry')),
  case_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  from_status text NOT NULL,
  to_status text NOT NULL,
  note text NOT NULL DEFAULT '' CONSTRAINT case_events_note_valid CHECK (char_length(note) <= 1000),
  status_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS case_events_case_version_idx ON case_events(case_type, case_id, status_version);
CREATE INDEX IF NOT EXISTS case_events_created_idx ON case_events(case_type, case_id, created_at);
