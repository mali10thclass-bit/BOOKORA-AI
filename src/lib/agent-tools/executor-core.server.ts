/**
 * BOOKORA AI — controlled tool execution core.
 *
 * Flow for every tool call:
 *   model request → schema validation → session/business authorization →
 *   confirmation gate (write actions) → execution against backend/RPC →
 *   result validation → audit log → structured result.
 *
 * The LLM never mutates the database. It can only request a tool; the server
 * validates and executes. Availability and booking rules are enforced by the
 * database (get_available_slots / public_create_booking / enforce_booking_rules).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  getAgentTool,
  isAgentToolName,
  type AgentToolName,
} from "./registry";
import {
  DECISION_DENIED_MESSAGE,
  EXECUTION_DENIED_MESSAGE,
  canDecideActionRequests,
  canExecuteActionRequests,
} from "./authorization";
import { sanitizeUntrustedData, wrapUntrusted } from "./guardrails";
import { logAiEvent } from "../ai-observability.server";

export type AgentSupabase = SupabaseClient<Database>;

export interface AgentBusinessContext {
  businessId: string;
  userId: string;
  role: string;
  plan: string;
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string | null;
    currency: string | null;
    cancellation_notice_hours: number;
    booking_buffer_minutes: number;
    email: string | null;
    phone: string | null;
    address: string | null;
    description: string | null;
    website: string | null;
  };
}

export interface AgentToolContext extends AgentBusinessContext {
  agentId?: string | null;
  conversationId?: string | null;
}

export type AgentToolResult =
  | { status: "completed"; toolName: string; output: Json; summary: string }
  | {
      status: "confirmation_required";
      toolName: string;
      proposalId: string;
      summary: string;
      input: Json;
    }
  | { status: "failed"; toolName: string; error: string; summary: string }
  | { status: "denied"; toolName: string; error: string; summary: string };

export type AgentToolMode = "auto" | "propose" | "commit";

const PLAN_TOOL_FEATURES: Record<string, string> = {
  create_booking: "ai_agent_operations",
  cancel_booking: "ai_agent_operations",
  reschedule_booking: "ai_agent_operations",
};

const PLAN_WITH_AI = new Set(["pro", "ultimate", "enterprise"]);

/**
 * Resolves the caller's business from trusted server/session/database context.
 * Client-provided business_id is intentionally ignored everywhere.
 */
export async function resolveAgentToolContext(
  supabase: AgentSupabase,
  userId: string,
): Promise<AgentBusinessContext | null> {
  const { data: member, error } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(id,name,slug,timezone,currency,plan,cancellation_notice_hours,booking_buffer_minutes,email,phone,address,description,website)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !member?.business_id) return null;

  const business = (
    member as unknown as {
      business_id: string;
      role: string;
      businesses: AgentBusinessContext["business"] & { plan: string | null };
    }
  ).businesses;

  if (!business) return null;

  return {
    businessId: member.business_id,
    userId,
    role: (member as unknown as { role: string }).role ?? "member",
    plan: business.plan ?? "free",
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
      currency: business.currency,
      cancellation_notice_hours: business.cancellation_notice_hours,
      booking_buffer_minutes: business.booking_buffer_minutes,
      email: business.email,
      phone: business.phone,
      address: business.address,
      description: business.description,
      website: business.website,
    },
  };
}

async function auditToolRun(
  supabase: AgentSupabase,
  ctx: AgentToolContext,
  toolName: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  // Best-effort audit trail (enterprise_audit_logs; member-scoped RLS).
  // Secrets and full payloads are never recorded.
  await supabase.from("enterprise_audit_logs").insert({
    business_id: ctx.businessId,
    actor_user_id: ctx.userId,
    action,
    entity_type: "ai_tool",
    metadata: {
      tool: toolName,
      agentId: ctx.agentId ?? null,
      conversationId: ctx.conversationId ?? null,
      ...metadata,
    },
  });
}

function todayInTz(timezone: string | null): string {
  const tz = timezone || "UTC";
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function nowIso(): string {
  return new Date().toISOString();
}

async function handleRead(
  supabase: AgentSupabase,
  ctx: AgentToolContext,
  toolName: AgentToolName,
  input: Record<string, unknown>,
): Promise<AgentToolResult> {
  switch (toolName) {
    case "get_business_info": {
      return {
        status: "completed",
        toolName,
        summary: "Business profile",
        output: ({
          name: ctx.business.name,
          description: ctx.business.description,
          timezone: ctx.business.timezone ?? "UTC",
          currency: ctx.business.currency,
          email: ctx.business.email,
          phone: ctx.business.phone,
          address: ctx.business.address,
          website: ctx.business.website,
          booking_buffer_minutes: ctx.business.booking_buffer_minutes,
          cancellation_notice_hours: ctx.business.cancellation_notice_hours,
        }) as unknown as Json,
      };
    }
    case "get_services": {
      let query = supabase
        .from("services")
        .select("id,name,description,category,duration_minutes,price,is_active")
        .eq("business_id", ctx.businessId)
        .order("name");
      if (!input.include_inactive) query = query.eq("is_active", true);
      const { data, error } = await query.limit(100);
      if (error) return { status: "failed", toolName, summary: "Read services", error: "Could not read services." };
      return { status: "completed", toolName, summary: `Read ${data?.length ?? 0} services`, output: data ?? [] };
    }
    case "get_staff": {
      let query = supabase
        .from("staff")
        .select("id,name,role,is_active")
        .eq("business_id", ctx.businessId)
        .order("name");
      if (!input.include_inactive) query = query.eq("is_active", true);
      const { data, error } = await query.limit(100);
      if (error) return { status: "failed", toolName, summary: "Read staff", error: "Could not read staff." };
      return { status: "completed", toolName, summary: `Read ${data?.length ?? 0} staff`, output: data ?? [] };
    }
    case "get_business_hours": {
      const daysAhead = typeof input.days_ahead === "number" ? input.days_ahead : 14;
      const fromDate = typeof input.from_date === "string" ? input.from_date : todayInTz(ctx.business.timezone);
      const { data: staffRows, error: staffError } = await supabase
        .from("staff")
        .select("id,name,working_hours(day_of_week,start_time,end_time,is_working)")
        .eq("business_id", ctx.businessId)
        .eq("is_active", true)
        .limit(50);
      if (staffError) {
        return { status: "failed", toolName, summary: "Read business hours", error: "Could not read working hours." };
      }
      const until = new Date(`${fromDate}T00:00:00Z`);
      until.setUTCDate(until.getUTCDate() + daysAhead);
      const { data: holidays } = await supabase
        .from("holidays")
        .select("holiday_date,name")
        .eq("business_id", ctx.businessId)
        .gte("holiday_date", fromDate)
        .lte("holiday_date", until.toISOString().slice(0, 10))
        .order("holiday_date");
      return {
        status: "completed",
        toolName,
        summary: "Read working hours and holidays",
        output: {
          timezone: ctx.business.timezone ?? "UTC",
          staff_hours: (staffRows ?? []).map((s) => ({ id: s.id, name: s.name, hours: s.working_hours })),
          holidays: holidays ?? [],
        } as unknown as Json,
      };
    }
    case "get_available_slots": {
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_business_slug: ctx.business.slug,
        p_service_id: input.service_id as string,
        p_staff_id: input.staff_id as string,
        p_date: input.date as string,
      });
      if (error) {
        return { status: "failed", toolName, summary: "Read availability", error: "Could not compute availability." };
      }
      return {
        status: "completed",
        toolName,
        summary: `Read slots for ${String(input.date)}`,
        output: {
          date: input.date,
          service_id: input.service_id,
          staff_id: input.staff_id,
          timezone: ctx.business.timezone ?? "UTC",
          slots: (data ?? []) as unknown as Json,
          note: "These are the only bookable times. Never invent other times.",
        } as unknown as Json,
      };
    }
    case "get_booking": {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,start_time,end_time,status,payment_status,price,notes,service_id,staff_id,customer_id,location_id")
        .eq("id", input.booking_id as string)
        .eq("business_id", ctx.businessId)
        .maybeSingle();
      if (error) return { status: "failed", toolName, summary: "Read booking", error: "Could not read the booking." };
      if (!data) return { status: "failed", toolName, summary: "Read booking", error: "Booking not found in this business." };
      return { status: "completed", toolName, summary: `Read booking ${data.id}`, output: data as unknown as Json };
    }
    case "search_customers": {
      const query = String(input.query ?? "");
      const limit = typeof input.limit === "number" ? input.limit : 10;
      const pattern = `%${query.replace(/[%_]/g, " ")}%`;
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,email,phone,total_visits,total_spent,last_visit_at")
        .eq("business_id", ctx.businessId)
        .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
        .order("name")
        .limit(limit);
      if (error) return { status: "failed", toolName, summary: "Search customers", error: "Customer search failed." };
      return { status: "completed", toolName, summary: `Found ${data?.length ?? 0} customers`, output: (data ?? []) as unknown as Json };
    }
    case "search_knowledge": {
      const { data, error } = await supabase.rpc("search_ai_knowledge_text", {
        p_business_id: ctx.businessId,
        p_query: String(input.query ?? ""),
        p_match_count: typeof input.match_count === "number" ? input.match_count : 5,
      });
      if (error) {
        return { status: "failed", toolName, summary: "Search knowledge", error: "Knowledge search failed." };
      }
      return {
        status: "completed",
        toolName,
        summary: `Found ${data?.length ?? 0} knowledge excerpts`,
        output: (data ?? []).map((item) => ({
          content: item.content,
          source_id: item.source_id,
          metadata: item.metadata,
        })) as unknown as Json,
      };
    }
    default:
      return { status: "failed", toolName, summary: "Unsupported read tool", error: "Unsupported tool." };
  }
}

async function executeWrite(
  supabase: AgentSupabase,
  ctx: AgentToolContext,
  toolName: AgentToolName,
  input: Record<string, unknown>,
): Promise<AgentToolResult> {
  switch (toolName) {
    case "create_booking": {
      const serviceId = input.service_id as string;
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id,name,duration_minutes,price")
        .eq("id", serviceId)
        .eq("business_id", ctx.businessId)
        .eq("is_active", true)
        .maybeSingle();
      if (serviceError || !service) {
        return { status: "failed", toolName, summary: "Create booking", error: "Service not found in this business." };
      }
      const start = new Date(String(input.start_time));
      if (Number.isNaN(start.getTime())) {
        return { status: "failed", toolName, summary: "Create booking", error: "Invalid start time." };
      }
      const end = new Date(start.getTime() + Math.max(1, service.duration_minutes) * 60_000);
      const { data, error } = await supabase.rpc("create_public_booking", {
        p_business_slug: ctx.business.slug,
        p_service_id: serviceId,
        p_staff_id: input.staff_id as string,
        p_location_id: (input.location_id as string | null) ?? null,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_customer_name: String(input.customer_name ?? ""),
        p_customer_email: (input.customer_email as string) || null,
        p_customer_phone: (input.customer_phone as string) || null,
      });
      if (error) {
        return { status: "failed", toolName, summary: "Create booking", error: "Booking could not be created." };
      }
      const result = (data ?? {}) as Record<string, unknown>;
      if (result["error"]) {
        return {
          status: "failed",
          toolName,
          summary: "Create booking",
          error: `Booking rejected by backend: ${String(result["error"])}`,
        };
      }
      return {
        status: "completed",
        toolName,
        summary: `Booking ${String(result["booking_id"] ?? "")} created for ${String(input.customer_name)}`,
        output: result as unknown as Json,
      };
    }
    case "cancel_booking": {
      const bookingId = input.booking_id as string;
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("id,start_time,end_time,status,staff_id,service_id,customer_id")
        .eq("id", bookingId)
        .eq("business_id", ctx.businessId)
        .maybeSingle();
      if (error || !booking) {
        return { status: "failed", toolName, summary: "Cancel booking", error: "Booking not found in this business." };
      }
      if (booking.status === "cancelled") {
        return { status: "failed", toolName, summary: "Cancel booking", error: "Booking is already cancelled." };
      }
      const noticeHours = ctx.business.cancellation_notice_hours ?? 0;
      const startsAt = new Date(booking.start_time).getTime();
      if (noticeHours > 0 && startsAt - Date.now() < noticeHours * 3_600_000) {
        return {
          status: "failed",
          toolName,
          summary: "Cancel booking",
          error: `Cancellation policy requires ${noticeHours} hours notice. This booking must be handled by staff.`,
        };
      }
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled", notes: input.reason ? `Cancelled via AI agent: ${String(input.reason)}` : "Cancelled via AI agent" })
        .eq("id", bookingId)
        .eq("business_id", ctx.businessId);
      if (updateError) {
        return { status: "failed", toolName, summary: "Cancel booking", error: "Cancellation failed." };
      }
      return {
        status: "completed",
        toolName,
        summary: `Booking ${bookingId} cancelled`,
        output: { booking_id: bookingId, status: "cancelled" } as unknown as Json,
      };
    }
    case "reschedule_booking": {
      const bookingId = input.booking_id as string;
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("id,start_time,end_time,status,staff_id,service_id")
        .eq("id", bookingId)
        .eq("business_id", ctx.businessId)
        .maybeSingle();
      if (error || !booking) {
        return { status: "failed", toolName, summary: "Reschedule booking", error: "Booking not found in this business." };
      }
      if (booking.status === "cancelled") {
        return { status: "failed", toolName, summary: "Reschedule booking", error: "A cancelled booking cannot be rescheduled." };
      }
      const newStart = new Date(String(input.new_start_time));
      if (Number.isNaN(newStart.getTime())) {
        return { status: "failed", toolName, summary: "Reschedule booking", error: "Invalid new start time." };
      }
      const staffId = (input.staff_id as string | undefined) ?? booking.staff_id;
      const { data: service } = await supabase
        .from("services")
        .select("duration_minutes")
        .eq("id", booking.service_id)
        .maybeSingle();
      const duration = Math.max(1, service?.duration_minutes ?? 30);
      const newEnd = new Date(newStart.getTime() + duration * 60_000);

      // Verify the requested slot exists in real backend availability.
      const { data: slots, error: slotError } = await supabase.rpc("get_available_slots", {
        p_business_slug: ctx.business.slug,
        p_service_id: booking.service_id,
        p_staff_id: staffId,
        p_date: newStart.toISOString().slice(0, 10),
      });
      const localStart = new Date(newStart.getTime() - newStart.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(11, 16);
      const slotList = Array.isArray(slots) ? (slots as string[]) : [];
      if (slotError || !slotList.includes(localStart)) {
        return {
          status: "failed",
          toolName,
          summary: "Reschedule booking",
          error: "The requested time is not available. Use get_available_slots to find real openings.",
        };
      }

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
          staff_id: staffId,
        })
        .eq("id", bookingId)
        .eq("business_id", ctx.businessId);
      if (updateError) {
        return { status: "failed", toolName, summary: "Reschedule booking", error: "Reschedule failed." };
      }
      return {
        status: "completed",
        toolName,
        summary: `Booking ${bookingId} moved to ${newStart.toISOString()}`,
        output: { booking_id: bookingId, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), staff_id: staffId } as unknown as Json,
      };
    }
    default:
      return { status: "failed", toolName, summary: "Unsupported write tool", error: "Unsupported tool." };
  }
}

async function handleHandoff(
  supabase: AgentSupabase,
  ctx: AgentToolContext,
  input: Record<string, unknown>,
): Promise<AgentToolResult> {
  const toolName: AgentToolName = "request_human_handoff";
  let agentId = ctx.agentId ?? null;
  if (!agentId) {
    const { data: existing } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("business_id", ctx.businessId)
      .neq("status", "archived")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      agentId = existing.id;
    } else {
      // Handoffs require an agent row; provision the default assistant once.
      const { data: created, error: createError } = await supabase
        .from("ai_agents")
        .insert({
          business_id: ctx.businessId,
          name: "BOOKORA Assistant",
          role: "business_assistant",
          description: "Default business assistant (created automatically for conversation handoff).",
          status: "active",
          created_by: ctx.userId,
        })
        .select("id")
        .single();
      if (createError || !created) {
        return {
          status: "failed",
          toolName,
          summary: "Human handoff",
          error: "Could not open a human handoff right now.",
        };
      }
      agentId = created.id;
    }
  }

  const { data: handoff, error } = await supabase
    .from("ai_agent_handoffs")
    .insert({
      business_id: ctx.businessId,
      agent_id: agentId,
      conversation_id: ctx.conversationId ?? null,
      reason: String(input.reason ?? "User requested a human"),
      notes: input.summary ? `Agent summary: ${String(input.summary)}` : null,
      status: "pending",
    })
    .select("id,status")
    .single();

  if (error || !handoff) {
    return { status: "failed", toolName, summary: "Human handoff", error: "Could not open a human handoff right now." };
  }

  return {
    status: "completed",
    toolName,
    summary: `Human handoff ${handoff.id} opened for the team`,
    output: {
      handoff_id: handoff.id,
      status: handoff.status,
      message: "A human team member has been notified and will continue this conversation. Nothing else has been changed.",
    } as unknown as Json,
  };
}

/**
 * Executes one tool call under full server-side control.
 *
 * mode:
 *   auto    — read/handoff execute; write actions return a confirmation proposal
 *   propose — even reads are not executed (unused today; reserved)
 *   commit  — executes a previously proposed write action after re-validation
 */
export async function runAgentToolCore(params: {
  toolName: string;
  input: unknown;
  mode?: AgentToolMode;
  proposalId?: string | null;
  ctx: AgentToolContext;
  supabase: AgentSupabase;
}): Promise<AgentToolResult> {
  const { supabase, ctx } = params;
  const mode: AgentToolMode = params.mode ?? "auto";
  const rawName = params.toolName;
  const tool = getAgentTool(rawName);

  if (!tool || !isAgentToolName(rawName)) {
    return { status: "denied", toolName: String(rawName), error: "Unknown tool.", summary: "Unknown tool" };
  }
  const toolName: AgentToolName = rawName;

  const parsed =
    mode === "commit"
      ? { success: true as const, data: {} as Record<string, unknown> }
      : tool.inputSchema.safeParse(params.input ?? {});
  if (!parsed.success) {
    return {
      status: "failed",
      toolName,
      summary: "Invalid arguments",
      error: `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"} ${i.message}`).join("; ")}`,
    };
  }
  const input = parsed.data as Record<string, unknown>;

  // Authorization: membership already resolved from the session. Write tools
  // additionally require an AI-enabled plan.
  if (PLAN_TOOL_FEATURES[toolName] && !PLAN_WITH_AI.has(ctx.plan)) {
    await auditToolRun(supabase, ctx, toolName, "ai_tool_denied", { reason: "plan" });
    return {
      status: "denied",
      toolName,
      summary: "Plan restriction",
      error: "This action requires a Pro, Ultimate or Enterprise plan.",
    };
  }

  try {
    if (tool.kind === "read") {
      const result = await handleRead(supabase, ctx, toolName, input);
      await auditToolRun(supabase, ctx, toolName, `ai_tool_${result.status}`, {
        summary: result.summary,
      });
      return result;
    }

    if (tool.kind === "handoff") {
      const result = await handleHandoff(supabase, ctx, input);
      await auditToolRun(supabase, ctx, toolName, `ai_tool_${result.status}`, {
        summary: result.summary,
      });
      return result;
    }

    // Write action path.
    if (mode !== "commit") {
      const summary = tool.summarizeInput(input);
      const { data: requestId, error: requestError } = await supabase.rpc("create_ai_action_request", {
        p_business_id: ctx.businessId,
        p_action_type: toolName,
        p_target_type: toolName === "create_booking" ? "service" : "booking",
        p_target_id: (toolName === "create_booking" ? input.service_id : input.booking_id) as string | null,
        p_proposal: input as unknown as Json,
        p_reason: summary,
      });
      if (requestError || !requestId) {
        return {
          status: "failed",
          toolName,
          summary,
          error: "Could not record the confirmation request.",
        };
      }
      await auditToolRun(supabase, ctx, toolName, "ai_tool_proposed", { proposalId: requestId, summary });
      logAiEvent("tool_proposed", {
        businessId: ctx.businessId,
        agentId: ctx.agentId ?? null,
        toolName,
        outcome: "confirmation_required",
      });
      return {
        status: "confirmation_required",
        toolName,
        proposalId: String(requestId),
        summary,
        input: input as unknown as Json,
      };
    }

    // Commit path: management roles only (mirrors the DB gate in
    // set_ai_action_request_decision; the database re-checks as authority).
    if (!canDecideActionRequests(ctx.role) || !canExecuteActionRequests(ctx.role)) {
      await auditToolRun(supabase, ctx, toolName, "ai_tool_denied", {
        reason: "role_not_manager",
        role: ctx.role,
      });
      return {
        status: "denied",
        toolName,
        summary: "Commit denied",
        error: DECISION_DENIED_MESSAGE,
      };
    }

    // Commit path: re-validate the proposal from the database before executing.
    const proposalId = params.proposalId;
    if (!proposalId) {
      return { status: "failed", toolName, summary: "Commit without proposal", error: "proposalId is required to confirm an action." };
    }
    const { data: proposal, error: proposalError } = await supabase
      .from("ai_action_requests")
      .select("id,business_id,actor_user_id,action_type,proposal,status")
      .eq("id", proposalId)
      .maybeSingle();
    if (proposalError || !proposal) {
      return { status: "failed", toolName, summary: "Commit rejected", error: "Confirmation request not found." };
    }
    if (proposal.business_id !== ctx.businessId) {
      await auditToolRun(supabase, ctx, toolName, "ai_tool_denied", { reason: "cross_tenant_proposal", proposalId });
      return { status: "denied", toolName, summary: "Commit rejected", error: "This request does not belong to your business." };
    }
    if (proposal.action_type !== toolName) {
      return { status: "failed", toolName, summary: "Commit rejected", error: "Confirmation request does not match this tool." };
    }
    if (proposal.status !== "pending" && proposal.status !== "approved") {
      return { status: "failed", toolName, summary: "Commit rejected", error: `Request is already ${proposal.status}.` };
    }

    // The confirmation click is the human approval (any authorized member).
    const { data: approved, error: approveError } = await supabase.rpc("set_ai_action_request_decision", {
      p_request_id: proposalId,
      p_status: "approved",
      p_reason: `Confirmed by user ${ctx.userId} via agent tool`,
    });
    if (approveError || approved !== true) {
      return { status: "failed", toolName, summary: "Commit rejected", error: "Could not approve the request." };
    }

    // Execute against the proposal payload stored server-side, not model input.
    const storedInput = tool.inputSchema.safeParse(proposal.proposal ?? {});
    if (!storedInput.success) {
      return { status: "failed", toolName, summary: "Commit rejected", error: "Stored proposal is invalid." };
    }
    const result = await executeWrite(supabase, ctx, toolName, storedInput.data as Record<string, unknown>);
    await auditToolRun(supabase, ctx, toolName, `ai_tool_${result.status}`, {
      proposalId,
      summary: result.summary,
    });
    logAiEvent("tool_executed", {
      businessId: ctx.businessId,
      agentId: ctx.agentId ?? null,
      toolName,
      outcome: result.status,
    });
    return result;
  } catch (error) {
    const message = sanitizeUntrustedData(error instanceof Error ? error.message : String(error), 300);
    logAiEvent("tool_executed", {
      businessId: ctx.businessId,
      agentId: ctx.agentId ?? null,
      toolName,
      outcome: "failure",
    });
    return {
      status: "failed",
      toolName,
      summary: "Tool crashed",
      error: `Tool execution failed: ${message}`,
    };
  }
}

/** Wraps a tool result as untrusted data for the model context. */
export function toolResultToUntrustedText(result: AgentToolResult): string {
  return wrapUntrusted(`tool_result:${result.toolName}:${result.status}`, sanitizeUntrustedData(result));
}
