-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_code VARCHAR(50) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status_message VARCHAR(255) NOT NULL,
    eta VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON trips
    FOR SELECT
    TO public
    USING (true);

-- Create policy to allow public update access (for the demo/simulator)
CREATE POLICY "Allow public update access" ON trips
    FOR UPDATE
    TO public
    USING (true);

-- Create policy to allow public insert access (for the demo/simulator)
CREATE POLICY "Allow public insert access" ON trips
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Insert the initial Ghost Bus trip
INSERT INTO trips (trip_code, latitude, longitude, status_message, eta)
VALUES ('CX-CT2JHB', -33.9249, 18.4241, 'Boarding - Cape Town Terminus', '06:15 AM')
ON CONFLICT (trip_code) DO NOTHING;

-- Enable Realtime for the trips table
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;

-- Create the tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    passenger_name VARCHAR(100) NOT NULL,
    seat_number VARCHAR(50) NOT NULL,
    departure_time VARCHAR(50) NOT NULL,
    arrival_time VARCHAR(50) NOT NULL,
    trip_code VARCHAR(50) REFERENCES trips(trip_code) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON tickets
    FOR SELECT
    TO public
    USING (true);

-- Insert the initial Ghost Bus ticket
INSERT INTO tickets (ticket_code, passenger_name, seat_number, departure_time, arrival_time, trip_code)
VALUES ('TKT-90210', 'Alex Johnson', '14A - Window', 'Cape Town (06:15 AM)', 'Johannesburg (08:30 PM)', 'CX-CT2JHB')
ON CONFLICT (ticket_code) DO NOTHING;

-- Add current_speed to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS current_speed INT DEFAULT 0;

