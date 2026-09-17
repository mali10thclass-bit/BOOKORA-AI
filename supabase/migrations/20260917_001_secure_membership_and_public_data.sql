-- ============================================================================
-- SECURITY: Membership role protection + public data scoping
--
-- Fixes (see security audit 2026-09-17):
--  1. business_members INSERT allowed ANY authenticated user to self-join
--     ANY business with ANY role (including 'owner') -> cross-tenant
--     privilege escalation. Now: self-join only into a business the user
--     created, and only as 'owner'; invites only by owner/admin and only
--     to roles at or below the inviter's own role.
--  2. business_members UPDATE allowed any member (even 'staff') to change
--     other members' roles -> self-promotion to owner. Now: only owners can
--     change roles or reassign user_id, and the last owner cannot be
--     demoted.
--  3. Anonymous INSERT on customers (public_insert_customers, WITH CHECK
--     (true)) allowed public booking visitors to inject arbitrary customer
--     rows into any business. Public booking must go through
--     public.create_public_booking() instead. Policy + grant removed.
--  4. Anonymous SELECT policies on services / staff / working_hours
--     referenced is_business_member() for which the anon role has no
--     EXECUTE permission (revoked 2026-09-12) -> anon queries could fail
--     with "permission denied for function" instead of returning rows.
--     Policies are split by role: anon reads only ACTIVE services/staff of
--     businesses that completed onboarding (mirrors public_select_business),
--     authenticated reads are scoped to membership as before.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, pinned search_path)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION role_rank(r text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT CASE r
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'manager' THEN 2
    WHEN 'staff' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION is_business_owner(b_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = b_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION is_business_owner_or_admin(b_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = b_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.role_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_rank(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_business_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_business_owner_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_owner_or_admin(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1. business_members INSERT: stop arbitrary self-join / role assignment
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "insert_business_member" ON business_members;
CREATE POLICY "insert_business_member" ON business_members FOR INSERT
  TO authenticated WITH CHECK (
    (
      -- Onboarding: the user joins the business THEY created, as owner.
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM businesses b
        WHERE b.id = business_id AND b.created_by = auth.uid()
      )
    )
    OR (
      -- Invites: only owners/admins may add members, and never to a higher
      -- role than their own (an admin cannot create an owner).
      is_business_owner_or_admin(business_id)
      AND role_rank(role) <= role_rank(
        (
          SELECT m.role FROM business_members m
          WHERE m.business_id = business_members.business_id
            AND m.user_id = auth.uid()
          LIMIT 1
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 2. business_members UPDATE: role changes are owner-only (trigger)
--    The policy still requires membership; the trigger enforces the
--    role hierarchy which a WITH CHECK clause cannot express (no access
--    to OLD role of the actor).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_business_member_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text;
  v_other_owners int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Cannot modify business members without authentication';
  END IF;

  SELECT m.role INTO v_actor_role
  FROM business_members m
  WHERE m.business_id = NEW.business_id AND m.user_id = auth.uid()
  LIMIT 1;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this business';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND v_actor_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the business owner can reassign a member''s user account';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF v_actor_role <> 'owner' THEN
      RAISE EXCEPTION 'Only the business owner can change member roles';
    END IF;

    IF OLD.role = 'owner' AND NEW.role <> 'owner' THEN
      SELECT COUNT(*) INTO v_other_owners
      FROM business_members
      WHERE business_id = OLD.business_id
        AND role = 'owner'
        AND id <> OLD.id;
      IF v_other_owners = 0 THEN
        RAISE EXCEPTION 'Cannot demote the last owner of a business';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_members_protect_roles ON business_members;
CREATE TRIGGER business_members_protect_roles
  BEFORE UPDATE ON business_members
  FOR EACH ROW
  EXECUTE FUNCTION protect_business_member_roles();

-- ----------------------------------------------------------------------------
-- 3. Remove anonymous customer inserts (public booking uses the RPC)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_insert_customers" ON customers;
REVOKE INSERT ON public.customers FROM anon;
REVOKE INSERT ON public.bookings FROM anon;

-- ----------------------------------------------------------------------------
-- 4. Split anon / authenticated SELECT policies (anon-safe expressions)
-- ----------------------------------------------------------------------------

-- Services
DROP POLICY IF EXISTS "select_services" ON services;
CREATE POLICY "select_services_members" ON services FOR SELECT
  TO authenticated USING (is_business_member(business_id));
CREATE POLICY "select_services_public" ON services FOR SELECT
  TO anon USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_id AND b.onboarding_completed = true
    )
  );

-- Staff
DROP POLICY IF EXISTS "select_staff" ON staff;
CREATE POLICY "select_staff_members" ON staff FOR SELECT
  TO authenticated USING (is_business_member(business_id));
CREATE POLICY "select_staff_public" ON staff FOR SELECT
  TO anon USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_id AND b.onboarding_completed = true
    )
  );

-- Working hours
DROP POLICY IF EXISTS "select_working_hours" ON working_hours;
CREATE POLICY "select_working_hours_members" ON working_hours FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = working_hours.staff_id
        AND is_business_member(s.business_id)
    )
  );
CREATE POLICY "select_working_hours_public" ON working_hours FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = working_hours.staff_id
        AND s.is_active = true
        AND EXISTS (
          SELECT 1 FROM businesses b
          WHERE b.id = s.business_id AND b.onboarding_completed = true
        )
    )
  );
