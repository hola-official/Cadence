-- Enable Row Level Security so the frontend anon key can read data

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_metadata ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon key) to read policies, charges, and plan metadata
CREATE POLICY IF NOT EXISTS "public read policies" ON policies FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "public read charges" ON charges FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "public read plan_metadata" ON plan_metadata FOR SELECT USING (true);
