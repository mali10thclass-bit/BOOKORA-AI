-- ============================================================================
-- SECURITY: AI action-request decisions require management roles
--
-- Hardening (production closure, 2026-09-27):
--   set_ai_action_request_decision() previously allowed ANY business member
--   (including 'staff') to approve or reject AI action requests. The required
--   policy is that only management-level roles may approve/reject.
--
--   Role model (business_members.role CHECK): owner(4) > admin(3) >
--   manager(2) > staff(1) — see role_rank() in 20260917_001.
--
--   New policy, enforced server/database-side:
--     - owner / admin / manager (role_rank >= 2) may approve or reject.
--     - staff and non-members may NOT.
--     - unauthenticated callers may NOT (execute revoked from anon/public).
--     - cross-business decisions are denied (request's business must match a
--       management membership of the caller).
--     - invalid status values are denied.
--     - an already-decided request cannot be re-decided (guarded by
--       status = 'pending' in the UPDATE; the function returns false).
--
--   execute_ai_action() is tightened to the same management gate so a
--   confirmed action can only be executed under a management role.
--
--   Existing protections preserved:
--     - last-owner protection (20260917_001) untouched.
--     - ai_agent_policies.allowed_actions policy gate in execute_ai_action.
--     - ai_action_requests RLS (direct UPDATE cannot reach 'approved').
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Management-role helper (mirrors src/lib/agent-tools/authorization.ts)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_business_manager_or_above(b_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = b_id
      AND user_id = auth.uid()
      AND public.role_rank(role) >= 2
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_manager_or_above(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_manager_or_above(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Decision function: manager-or-above only
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_ai_action_request_decision(
  p_request_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT business_id INTO v_business_id
  FROM public.ai_action_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- Do not leak existence: unknown request and foreign request both deny.
  IF v_business_id IS NULL
     OR v_actor IS NULL
     OR NOT public.is_business_manager_or_above(v_business_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.ai_action_requests
  SET status = p_status,
      reason = COALESCE(p_reason, reason),
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END
  WHERE id = p_request_id
    AND status = 'pending';

  IF FOUND THEN
    INSERT INTO public.enterprise_audit_logs(business_id, actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (
      v_business_id, v_actor,
      'ai_action_decision_' || p_status,
      'ai_action_request', p_request_id,
      jsonb_build_object('reason', COALESCE(p_reason, ''))
    );
  END IF;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_action_request_decision(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_action_request_decision(uuid, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Execution: same management gate (approved actions are consequential)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_ai_action(p_action_id uuid)
RETURNS public.ai_action_requests
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  a public.ai_action_requests;
  allowed boolean;
  task public.business_tasks;
BEGIN
  SELECT * INTO a FROM public.ai_action_requests WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AI action not found'; END IF;
  IF NOT public.is_business_manager_or_above(a.business_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF a.status <> 'approved' THEN RAISE EXCEPTION 'AI action must be approved'; END IF;

  SELECT a.action_type = ANY(p.allowed_actions)
    INTO allowed
  FROM public.ai_agent_policies p
  WHERE p.business_id = a.business_id
  ORDER BY p.created_at ASC LIMIT 1;

  IF COALESCE(allowed, false) = false THEN
    RAISE EXCEPTION 'Action is not allowed by the agent policy';
  END IF;

  IF a.action_type = 'create_task' THEN
    INSERT INTO public.business_tasks(business_id, title, priority, due_at, related_customer_id)
    VALUES (
      a.business_id,
      LEFT(COALESCE(a.proposal->>'title', 'AI task'), 200),
      LEFT(COALESCE(a.proposal->>'priority', 'normal'), 20),
      NULLIF(a.proposal->>'due_at', '')::timestamptz,
      NULLIF(a.proposal->>'customer_id', '')::uuid
    ) RETURNING * INTO task;
  ELSIF a.action_type = 'inventory_adjustment' THEN
    PERFORM public.record_inventory_movement(
      a.business_id,
      (a.proposal->>'product_id')::uuid,
      (a.proposal->>'quantity_delta')::numeric,
      COALESCE(a.proposal->>'reason', 'AI adjustment')
    );
  ELSE
    RAISE EXCEPTION 'Unsupported AI action type';
  END IF;

  UPDATE public.ai_action_requests
  SET status = 'executed', executed_at = now(), reason = 'Executed by authorized server action'
  WHERE id = p_action_id
  RETURNING * INTO a;

  INSERT INTO public.enterprise_audit_logs(business_id, actor_user_id, action, metadata)
  VALUES (a.business_id, a.actor_user_id, 'ai_action_executed', jsonb_build_object(
    'action_id', a.id, 'action_type', a.action_type,
    'target_type', a.target_type, 'target_id', a.target_id
  ));

  RETURN a;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_ai_action(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_ai_action(uuid) TO authenticated;
