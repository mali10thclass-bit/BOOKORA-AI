-- Businesses
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  logo_url text,
  primary_color text DEFAULT '#2563eb',
  timezone text DEFAULT 'UTC',
  currency text DEFAULT 'USD',
  phone text,
  email text,
  address text,
  website text,
  onboarding_completed boolean DEFAULT false,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'ultimate')),
  plan_status text DEFAULT 'trialing' CHECK (plan_status IN ('active', 'trialing', 'past_due', 'canceled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid(),
  role text DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
  invited_email text,
  invite_status text DEFAULT 'accepted' CHECK (invite_status IN ('pending', 'accepted', 'declined')),
  email text,
  full_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price numeric(10,2) NOT NULL DEFAULT 0,
  color text DEFAULT '#3b82f6',
  is_active boolean DEFAULT true,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  role text DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
  bio text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  is_working boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  notes text,
  tags text[] DEFAULT '{}',
  total_visits integer DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  last_visit_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  price numeric(10,2) DEFAULT 0,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partial')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  method text DEFAULT 'cash' CHECK (method IN ('cash', 'card', 'transfer', 'online')),
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'refunded', 'partial')),
  reference text,
  notes text,
  processed_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking_confirmation', 'booking_reminder', 'booking_cancelled', 'booking_rescheduled', 'payment_received')),
  channel text DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push')),
  recipient text,
  subject text,
  body text,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Data API grants (required; the original migration omitted these)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

GRANT SELECT ON public.businesses TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.staff TO anon;
GRANT SELECT ON public.working_hours TO anon;
GRANT INSERT ON public.customers TO anon;
GRANT INSERT ON public.bookings TO anon;

GRANT ALL ON public.businesses TO service_role;
GRANT ALL ON public.business_members TO service_role;
GRANT ALL ON public.locations TO service_role;
GRANT ALL ON public.services TO service_role;
GRANT ALL ON public.staff TO service_role;
GRANT ALL ON public.working_hours TO service_role;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_business_member(b_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = b_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "select_own_business" ON businesses;
CREATE POLICY "select_own_business" ON businesses FOR SELECT
  TO authenticated USING (is_business_member(id));

-- Public booking page needs to resolve a business by its slug
DROP POLICY IF EXISTS "public_select_business" ON businesses;
CREATE POLICY "public_select_business" ON businesses FOR SELECT
  TO anon USING (onboarding_completed = true);

-- Missing from the original file: onboarding could not create a business
DROP POLICY IF EXISTS "insert_business" ON businesses;
CREATE POLICY "insert_business" ON businesses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_business" ON businesses;
CREATE POLICY "update_own_business" ON businesses FOR UPDATE
  TO authenticated USING (is_business_member(id)) WITH CHECK (is_business_member(id));

DROP POLICY IF EXISTS "select_business_members" ON business_members;
CREATE POLICY "select_business_members" ON business_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR is_business_member(business_id)
  );

DROP POLICY IF EXISTS "insert_business_member" ON business_members;
CREATE POLICY "insert_business_member" ON business_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR is_business_member(business_id));

DROP POLICY IF EXISTS "update_business_member" ON business_members;
CREATE POLICY "update_business_member" ON business_members FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "select_locations" ON locations;
CREATE POLICY "select_locations" ON locations FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "insert_locations" ON locations;
CREATE POLICY "insert_locations" ON locations FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "update_locations" ON locations;
CREATE POLICY "update_locations" ON locations FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_locations" ON locations;
CREATE POLICY "delete_locations" ON locations FOR DELETE
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "select_services" ON services;
CREATE POLICY "select_services" ON services FOR SELECT
  TO anon, authenticated USING (is_business_member(business_id) OR is_active = true);

DROP POLICY IF EXISTS "insert_services" ON services;
CREATE POLICY "insert_services" ON services FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "update_services" ON services;
CREATE POLICY "update_services" ON services FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_services" ON services;
CREATE POLICY "delete_services" ON services FOR DELETE
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "select_staff" ON staff;
CREATE POLICY "select_staff" ON staff FOR SELECT
  TO anon, authenticated USING (is_business_member(business_id) OR is_active = true);

DROP POLICY IF EXISTS "insert_staff" ON staff;
CREATE POLICY "insert_staff" ON staff FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "update_staff" ON staff;
CREATE POLICY "update_staff" ON staff FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_staff" ON staff;
CREATE POLICY "delete_staff" ON staff FOR DELETE
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "select_working_hours" ON working_hours;
CREATE POLICY "select_working_hours" ON working_hours FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = working_hours.staff_id AND (is_business_member(staff.business_id) OR staff.is_active = true))
  );

DROP POLICY IF EXISTS "insert_working_hours" ON working_hours;
CREATE POLICY "insert_working_hours" ON working_hours FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = working_hours.staff_id AND is_business_member(staff.business_id))
  );

DROP POLICY IF EXISTS "update_working_hours" ON working_hours;
CREATE POLICY "update_working_hours" ON working_hours FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = working_hours.staff_id AND is_business_member(staff.business_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = working_hours.staff_id AND is_business_member(staff.business_id))
  );

DROP POLICY IF EXISTS "delete_working_hours" ON working_hours;
CREATE POLICY "delete_working_hours" ON working_hours FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = working_hours.staff_id AND is_business_member(staff.business_id))
  );

DROP POLICY IF EXISTS "select_customers" ON customers;
CREATE POLICY "select_customers" ON customers FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "insert_customers" ON customers;
CREATE POLICY "insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "public_insert_customers" ON customers;
CREATE POLICY "public_insert_customers" ON customers FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "update_customers" ON customers;
CREATE POLICY "update_customers" ON customers FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_customers" ON customers;
CREATE POLICY "delete_customers" ON customers FOR DELETE
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "select_bookings" ON bookings;
CREATE POLICY "select_bookings" ON bookings FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "insert_bookings" ON bookings;
CREATE POLICY "insert_bookings" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_bookings" ON bookings;
CREATE POLICY "update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_bookings" ON bookings;
CREATE POLICY "delete_bookings" ON bookings FOR DELETE
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "select_payments" ON payments;
CREATE POLICY "select_payments" ON payments FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "update_payments" ON payments;
CREATE POLICY "update_payments" ON payments FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_payments" ON payments;
CREATE POLICY "delete_payments" ON payments FOR DELETE
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (is_business_member(business_id));

CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_business_id ON staff(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS businesses_updated_at ON businesses;
CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();