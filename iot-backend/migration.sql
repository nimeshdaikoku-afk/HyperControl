-- Enable pgcrypto if you want UUID/random functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- Groups table
-- =====================
CREATE TABLE IF NOT EXISTS groups (
    group_code SERIAL PRIMARY KEY,   -- numeric unique ID
    group_id TEXT UNIQUE NOT NULL    -- human-readable name
);

-- =====================
-- Devices table
-- =====================
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,             -- device_id like "light123"
    name TEXT,
    latitude FLOAT,
    longitude FLOAT,
    opaque_token TEXT UNIQUE,        -- short random token instead of JWT
    group_code INT REFERENCES groups(group_code)
);

-- =====================
-- Telemetry table
-- =====================
CREATE TABLE IF NOT EXISTS telemetry (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
    ts TIMESTAMP DEFAULT NOW(),
    topic TEXT,
    payload JSONB
);

-- =====================
-- Device status table
-- =====================
CREATE TABLE IF NOT EXISTS device_status (
    device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    led_status TEXT,
    last_seen TIMESTAMP
);

-- =====================
-- Indexes
-- =====================
CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(ts);
CREATE INDEX IF NOT EXISTS idx_device_status_id ON device_status(device_id);

