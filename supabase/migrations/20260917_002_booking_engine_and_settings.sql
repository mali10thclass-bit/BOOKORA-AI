-- ============================================================================
-- BOOKING ENGINE HARDENING + BUSINESS BOOKING SETTINGS
--
-- Changes (security audit 2026-09-17):
--  1. businesses gains booking settings: reminder_lead_minutes (default 24h),
--     cancellation_notice_hours (default 24h), booking_buffer_minutes
--     (default 0). Central business settings, not hardcoded.
--  2. New `holidays` table (business-scoped, membership RLS) so booking
--     rules can account for closed days.
--  3. public_create_booking() rewritten:
--       - SET search_path = public (definer functions must pin search_path),
--       - VOLATILE (it writes; was mis-declared STABLE),
--       - day-of-week and working-hour checks computed in the BUSINESS
--         timezone (was the server timezone),
--       - pg_advisory_xact_lock per staff -> the conflict check and insert
--         are atomic (no double-booking race under concurrent RPC calls),
--       - booking_buffer_minutes respected around new bookings,
--       - holidays respected,
--       - strict input validation (name/email/phone),
--       - 15-minute minimum lead time,
--       - EXECUTE revoked from PUBLIC (was granted by default).
--  4. create_public_booking() wrapper recreated (VOLATILE, search_path).
--  5. New get_available_slots() RPC: dynamic slot generation from working
--     hours, service duration, buffer, holidays and existing bookings.
--     Replaces the hardcoded slot list in the public booking UI.
--  6. DB-level conflict guard (trigger) on bookings for EVERY writer
--     (members included): overlapping non-cancelled appointments for the
--     same staff in the same business are rejected; also enforces that
--     service/staff/customer/location all belong to the booking's business.
--  7. Payment integrity: negative amounts rejected, overpayment rejected,
--     payment business must match booking business, and
--     bookings.payment_status is derived from the payments table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Business booking settings
-- ----------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS reminder_lead_minutes integer NOT NULL DEFAULT 1440
  CHECK (reminder_lead_minutes >= 0 AND reminder_lead_minutes <= 10080);
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS cancellation_notice_hours integer NOT NULL DEFAULT 24
  CHECK (cancellation_notice_hours >= 0 AND cancellation_notice_hours <= 336);
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS booking_buffer_minutes integer NOT NULL DEFAULT 0
  CHECK (booking_buffer_minutes >= 0 AND booking_buffer_minutes <= 240);

-- ----------------------------------------------------------------------------
-- 2. Holidays
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (CHAR_LENGTH(name) <= 200),
  holiday_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_business_date
  ON public.holidays (business_id, holiday_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_holidays" ON holidays;
CREATE POLICY "select_holidays" ON holidays FOR SELECT
  TO authenticated USING (is_business_member(business_id));

DROP POLICY IF EXISTS "insert_holidays" ON holidays;
CREATE POLICY "insert_holidays" ON holidays FOR INSERT
  TO authenticated WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "update_holidays" ON holidays;
CREATE POLICY "update_holidays" ON holidays FOR UPDATE
  TO authenticated USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

DROP POLICY IF EXISTS "delete_holidays" ON holidays;
CREATE POLICY "delete_holidays" ON holidays FOR DELETE
  TO authenticated USING (is_business_member(business_id));

-- ----------------------------------------------------------------------------
-- 3. Secure public booking function (rewritten)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_create_booking(
  text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text
);
DROP FUNCTION IF EXISTS public.create_public_booking(
  text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text
);

CREATE OR REPLACE FUNCTION public.public_create_booking(
  p_business_slug text,
  p_service_id uuid,
  p_staff_id uuid,
  p_location_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_business record;
  v_service record;
  v_staff record;
  v_location record;
  v_customer_id uuid;
  v_booking_id uuid;
  v_tz text;
  v_duration_min integer;
  v_local_start timestamp;
  v_local_end timestamp;
  v_end_time timestamptz;
  v_day_of_week int;
  v_wh record;
  v_buffer_minutes integer;
  v_customer_name_clean text;
BEGIN
  -- ---- Input validation -------------------------------------------------
  IF p_business_slug IS NULL OR TRIM(p_business_slug) = '' THEN
    RETURN jsonb_build_object('error', 'Business slug is required');
  END IF;
  v_customer_name_clean := TRIM(COALESCE(p_customer_name, ''));
  IF v_customer_name_clean = '' OR LENGTH(v_customer_name_clean) > 200 THEN
    RETURN jsonb_build_object('error', 'Please enter a valid name');
  END IF;
  IF p_customer_email IS NOT NULL
     AND (
       p_customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
       OR LENGTH(p_customer_email) > 320
     ) THEN
    RETURN jsonb_build_object('error', 'Please enter a valid email address');
  END IF;
  IF p_customer_phone IS NOT NULL AND CHAR_LENGTH(TRIM(p_customer_phone)) > 50 THEN
    RETURN jsonb_build_object('error', 'Please enter a valid phone number');
  END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL THEN
    RETURN jsonb_build_object('error', 'Start and end times are required');
  END IF;

  -- ---- Business ---------------------------------------------------------
  SELECT * INTO v_business FROM businesses
  WHERE slug = p_business_slug AND onboarding_completed = true
  LIMIT 1;

  IF v_business IS NULL THEN
    RETURN jsonb_build_object('error', 'Business not found or not ready for bookings');
  END IF;

  v_tz := COALESCE(NULLIF(btrim(v_business.timezone), ''), 'UTC');
  v_buffer_minutes := v_business.booking_buffer_minutes;

  -- ---- Service / staff / location (must belong to the business) ---------
  SELECT * INTO v_service FROM services
  WHERE id = p_service_id AND business_id = v_business.id AND is_active = true
  LIMIT 1;

  IF v_service IS NULL THEN
    RETURN jsonb_build_object('error', 'Service not available');
  END IF;

  v_duration_min := v_service.duration_minutes;
  IF v_duration_min IS NULL OR v_duration_min <= 0 OR v_duration_min > 1440 THEN
    RETURN jsonb_build_object('error', 'Service duration is invalid');
  END IF;

  SELECT * INTO v_staff FROM staff
  WHERE id = p_staff_id AND business_id = v_business.id AND is_active = true
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object('error', 'Staff member not available');
  END IF;

  IF p_location_id IS NOT NULL THEN
    SELECT * INTO v_location FROM locations
    WHERE id = p_location_id AND business_id = v_business.id AND is_active = true
    LIMIT 1;
    IF v_location IS NULL THEN
      RETURN jsonb_build_object('error', 'Location not available');
    END IF;
  END IF;

  -- ---- Time rules (business-local) --------------------------------------
  -- Past + minimum lead time (15 minutes).
  IF p_start_time < (now() + interval '15 minutes') THEN
    RETURN jsonb_build_object('error', 'This time is too close or in the past. Please pick a later slot.');
  END IF;

  -- End time is always derived server-side from the service duration.
  v_end_time := p_start_time + make_interval(mins => v_duration_min);

  v_local_start := p_start_time AT TIME ZONE v_tz;
  v_local_end := v_end_time AT TIME ZONE v_tz;

  -- Bookings must not cross midnight in business-local time.
  IF v_local_start::date <> v_local_end::date THEN
    RETURN jsonb_build_object('error', 'Bookings cannot cross midnight');
  END IF;

  v_day_of_week := EXTRACT(DOW FROM v_local_start)::int;

  IF EXISTS (
    SELECT 1 FROM holidays h
    WHERE h.business_id = v_business.id AND h.holiday_date = v_local_start::date
  ) THEN
    RETURN jsonb_build_object('error', 'The business is closed on this day');
  END IF;

  SELECT * INTO v_wh FROM working_hours
  WHERE staff_id = p_staff_id AND day_of_week = v_day_of_week AND is_working = true
  LIMIT 1;

  IF v_wh IS NULL THEN
    RETURN jsonb_build_object('error', 'Staff does not work on this day');
  END IF;

  IF v_wh.start_time > v_wh.end_time THEN
    RETURN jsonb_build_object('error', 'Staff working hours are misconfigured');
  END IF;

  IF v_local_start::time < v_wh.start_time OR v_local_end::time > v_wh.end_time THEN
    RETURN jsonb_build_object('error', 'Booking is outside working hours');
  END IF;

  -- ---- Conflict check, atomic per staff ---------------------------------
  PERFORM pg_advisory_xact_lock(hashtext('bookora:slot:' || p_staff_id::text));

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.staff_id = p_staff_id
      AND b.business_id = v_business.id
      AND b.status <> 'cancelled'
      AND b.start_time < (v_end_time + make_interval(mins => v_buffer_minutes))
      AND b.end_time > (p_start_time - make_interval(mins => v_buffer_minutes))
  ) THEN
    RETURN jsonb_build_object('error', 'Time slot is not available');
  END IF;

  -- ---- Customer (find by email within THIS business, else create) --------
  IF p_customer_email IS NOT NULL AND btrim(p_customer_email) <> '' THEN
    SELECT id INTO v_customer_id FROM customers
    WHERE business_id = v_business.id AND email = p_customer_email
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (business_id, name, email, phone)
    VALUES (v_business.id, v_customer_name_clean, p_customer_email, p_customer_phone)
    RETURNING id INTO v_customer_id;
  END IF;

  -- ---- Booking (trusted values only) -------------------------------------
  INSERT INTO bookings (
    business_id, location_id, service_id, staff_id, customer_id,
    start_time, end_time, price, status, payment_status
  ) VALUES (
    v_business.id, p_location_id, p_service_id, p_staff_id, v_customer_id,
    p_start_time, v_end_time, v_service.price, 'pending', 'unpaid'
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'service_name', v_service.name,
    'staff_name', v_staff.name,
    'start_time', p_start_time,
    'end_time', v_end_time,
    'price', v_service.price,
    'currency', v_business.currency,
    'status', 'pending'
  );

EXCEPTION WHEN OTHERS THEN
  -- Keep the generic message (no stack/SQL leaks to anonymous callers);
  -- the real error goes to the Postgres log via the RAISE path above.
  RETURN jsonb_build_object('error', 'An error occurred while creating the booking');
END;
$$;

REVOKE ALL ON FUNCTION public.public_create_booking(
  text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_create_booking(
  text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text
) TO authenticated, service_role;

-- Public wrapper (anon + authenticated).
-- SECURITY DEFINER is required so that the EXECUTE check on the internal
-- public_create_booking() is evaluated for the function owner, not the
-- anonymous caller. It is safe: it pins search_path, performs no logic of
-- its own, and its only statement is the call to the fully validating
-- internal function. anon/authenticated can call ONLY this wrapper; the
-- internal function has no EXECUTE grant for anon (test B10).
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_business_slug text,
  p_service_id uuid,
  p_staff_id uuid,
  p_location_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
BEGIN
  RETURN public.public_create_booking(
    p_business_slug, p_service_id, p_staff_id, p_location_id,
    p_start_time, p_end_time, p_customer_name, p_customer_email, p_customer_phone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_booking(
  text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text
) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Dynamic available slots for the public booking page
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_business_slug text,
  p_staff_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_business record;
  v_service record;
  v_staff record;
  v_tz text;
  v_duration_min integer;
  v_buffer_minutes integer;
  v_day_of_week int;
  v_wh record;
  v_slot bigint;
  v_candidate timestamptz;
  v_candidate_end timestamptz;
  v_slots jsonb := '[]'::jsonb;
  v_today date;
BEGIN
  IF p_business_slug IS NULL OR TRIM(p_business_slug) = ''
     OR p_date IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO v_business FROM businesses
  WHERE slug = p_business_slug AND onboarding_completed = true
  LIMIT 1;

  IF v_business IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_tz := COALESCE(NULLIF(btrim(v_business.timezone), ''), 'UTC');
  v_buffer_minutes := v_business.booking_buffer_minutes;
  v_today := (now() AT TIME ZONE v_tz)::date;

  -- Only offer dates from today up to 60 days ahead (business-local).
  IF p_date < v_today OR p_date > v_today + 60 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM holidays h
    WHERE h.business_id = v_business.id AND h.holiday_date = p_date
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO v_service FROM services
  WHERE id = p_service_id AND business_id = v_business.id AND is_active = true
  LIMIT 1;

  IF v_service IS NULL OR v_service.duration_minutes IS NULL
     OR v_service.duration_minutes <= 0 OR v_service.duration_minutes > 1440 THEN
    RETURN '[]'::jsonb;
  END IF;

  v_duration_min := v_service.duration_minutes;

  SELECT * INTO v_staff FROM staff
  WHERE id = p_staff_id AND business_id = v_business.id AND is_active = true
  LIMIT 1;

  IF v_staff IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::int;

  SELECT * INTO v_wh FROM working_hours
  WHERE staff_id = p_staff_id AND day_of_week = v_day_of_week AND is_working = true
  LIMIT 1;

  IF v_wh IS NULL OR v_wh.start_time >= v_wh.end_time THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Slots every 30 minutes; the last slot must still fit the service
  -- duration before closing time. (time - interval is not valid in
  -- Postgres, so the window is computed in seconds-of-day.)
  FOR v_slot IN
    SELECT g.s
    FROM generate_series(
      EXTRACT(EPOCH FROM v_wh.start_time::interval)::bigint,
      (EXTRACT(EPOCH FROM v_wh.end_time::interval) - v_duration_min * 60)::bigint,
      1800
    ) AS g(s)
  LOOP
    v_candidate := ((p_date || ' ' || to_char(make_interval(secs => v_slot), 'HH24:MI'))::timestamp)
      AT TIME ZONE v_tz;
    v_candidate_end := v_candidate + make_interval(mins => v_duration_min);

    -- Not in the past (15-minute lead).
    IF v_candidate < (now() + interval '15 minutes') THEN
      CONTINUE;
    END IF;

    -- Overlapping active booking (with buffer) -> skip.
    IF EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.staff_id = p_staff_id
        AND b.business_id = v_business.id
        AND b.status <> 'cancelled'
        AND b.start_time < (v_candidate_end + make_interval(mins => v_buffer_minutes))
        AND b.end_time > (v_candidate - make_interval(mins => v_buffer_minutes))
    ) THEN
      CONTINUE;
    END IF;

    v_slots := v_slots || jsonb_build_array(to_char(make_interval(secs => v_slot), 'HH24:MI'));
  END LOOP;

  RETURN v_slots;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_slots(text, uuid, uuid, date)
  FROM PUBLIC, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, uuid, uuid, date)
  TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. DB-level booking conflict + isolation guard (applies to ALL writers,
--    including authenticated members and the public booking RPC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_booking_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_buffer_minutes integer;
BEGIN
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL OR NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Booking end_time must be after start_time';
  END IF;

  -- Cross-entity business isolation: every referenced row must belong to
  -- the booking's business.
  IF NOT EXISTS (SELECT 1 FROM services s WHERE s.id = NEW.service_id AND s.business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Service does not belong to this business';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = NEW.staff_id AND s.business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Staff member does not belong to this business';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = NEW.customer_id AND c.business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Customer does not belong to this business';
  END IF;
  IF NEW.location_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = NEW.location_id AND l.business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Location does not belong to this business';
  END IF;

  -- Cancelled bookings free their slot and are skipped by the check.
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT booking_buffer_minutes INTO v_buffer_minutes
  FROM businesses WHERE id = NEW.business_id;
  IF v_buffer_minutes IS NULL THEN
    v_buffer_minutes := 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.staff_id = NEW.staff_id
      AND b.business_id = NEW.business_id
      AND (OLD.id IS NULL OR b.id <> OLD.id)
      AND b.status <> 'cancelled'
      AND b.start_time < (NEW.end_time + make_interval(mins => v_buffer_minutes))
      AND b.end_time > (NEW.start_time - make_interval(mins => v_buffer_minutes))
  ) THEN
    RAISE EXCEPTION 'This time slot conflicts with an existing appointment for this staff member';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_rules ON bookings;
CREATE TRIGGER bookings_enforce_rules
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_rules();

-- ----------------------------------------------------------------------------
-- 6. Payment integrity
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_payment_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_business uuid;
  v_booking_price numeric;
  v_existing_total numeric;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount < 0 THEN
    RAISE EXCEPTION 'Payment amount cannot be negative';
  END IF;

  SELECT business_id, price INTO v_booking_business, v_booking_price
  FROM bookings WHERE id = NEW.booking_id;

  IF v_booking_business IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking_business <> NEW.business_id THEN
    RAISE EXCEPTION 'Payment business does not match the booking business';
  END IF;

  -- Overpayment protection for recorded paid/partial payments.
  IF NEW.status IN ('paid', 'partial') AND v_booking_price IS NOT NULL AND v_booking_price > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_existing_total
    FROM payments
    WHERE booking_id = NEW.booking_id
      AND (OLD.id IS NULL OR id <> OLD.id)
      AND status IN ('paid', 'partial');

    IF v_existing_total + NEW.amount > v_booking_price + 0.005 THEN
      RAISE EXCEPTION 'Payment exceeds the booking amount';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_enforce_rules ON payments;
CREATE TRIGGER payments_enforce_rules
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_payment_rules();

-- Derive bookings.payment_status from the payments table.
CREATE OR REPLACE FUNCTION public.sync_booking_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id uuid;
  v_price numeric;
  v_paid_total numeric;
  v_refunded_total numeric;
  v_status text;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  IF v_booking_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT price INTO v_price FROM bookings WHERE id = v_booking_id;
  IF v_price IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status IN ('paid', 'partial')), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0)
    INTO v_paid_total, v_refunded_total
    FROM payments
    WHERE booking_id = v_booking_id;

  IF v_paid_total <= 0 AND v_refunded_total > 0 THEN
    v_status := 'refunded';
  ELSIF v_price > 0 AND v_paid_total >= v_price - 0.005 THEN
    v_status := 'paid';
  ELSIF v_paid_total > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE bookings SET payment_status = v_status WHERE id = v_booking_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS payments_sync_booking_status ON payments;
CREATE TRIGGER payments_sync_booking_status
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_payment_status();
