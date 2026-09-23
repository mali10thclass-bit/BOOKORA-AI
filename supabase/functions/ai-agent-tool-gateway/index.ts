import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS");
if (!url || !key) throw new Error("Missing configuration");

const admin = createClient(url, key);

type JsonInput = Record<string, unknown>;

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return Response.json({ error: "Authentication required" }, { status: 401 });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const toolId = String(body.toolId ?? "").trim();
    const requestedInput = (body.input ?? {}) as JsonInput;
    const approvalRunId = String(body.approvalRunId ?? "").trim();

    if (!toolId) return Response.json({ error: "toolId required" }, { status: 400 });

    const { data: tool, error: toolError } = await admin
      .from("ai_agent_tools")
      .select("id,business_id,agent_id,name,description,tool_type,config,approval_required,enabled")
      .eq("id", toolId)
      .eq("enabled", true)
      .maybeSingle();

    if (toolError) throw toolError;
    if (!tool) return Response.json({ error: "Tool not found" }, { status: 404 });

    const { data: member, error: memberError } = await admin
      .from("business_members")
      .select("business_id")
      .eq("business_id", tool.business_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) return Response.json({ error: "Not authorized" }, { status: 403 });

    const featureByTool: Record<string, string> = {
      knowledge: "knowledge_rag",
      analytics: "analytics",
      crm: "crm_ai",
      automation: "advanced_automation",
      booking: "ai_agent_operations",
      webhook: "ai_agent_operations",
      http: "ai_agent_operations",
      database: "ai_agent_operations",
      custom: "ai_agent_operations",
    };
    const requiredFeature = featureByTool[tool.tool_type] ?? "ai_agent_operations";
    const { data: allowed, error: entitlementError } = await admin.rpc("bookora_plan_allows_feature", {
      b_id: tool.business_id,
      feature_key: requiredFeature,
    });
    if (entitlementError) throw entitlementError;
    if (allowed !== true) {
      return Response.json({ error: "This AI tool requires a higher BOOKORA plan.", requiredFeature }, { status: 402 });
    }

    const runBase = {
      business_id: tool.business_id,
      agent_id: tool.agent_id,
      tool_id: tool.id,
      actor_user_id: userData.user.id,
      source: "agent",
    };

    let input = requestedInput;
    let approvedRunId: string | null = null;

    if (tool.approval_required) {
      if (!approvalRunId) {
        const { data: run, error: insertError } = await admin
          .from("ai_agent_tool_runs")
          .insert({ ...runBase, input: requestedInput, status: "proposed", output: {} })
          .select("id")
          .single();

        if (insertError) throw insertError;
        return Response.json({ status: "approval_required", runId: run.id });
      }

      const { data: proposed, error: proposedError } = await admin
        .from("ai_agent_tool_runs")
        .select("id,business_id,agent_id,tool_id,actor_user_id,input,status")
        .eq("id", approvalRunId)
        .eq("business_id", tool.business_id)
        .eq("agent_id", tool.agent_id)
        .eq("tool_id", tool.id)
        .eq("actor_user_id", userData.user.id)
        .eq("status", "proposed")
        .maybeSingle();

      if (proposedError) throw proposedError;
      if (!proposed) return Response.json({ error: "Approval request is missing, already used, or does not match this tool." }, { status: 409 });

      const { data: approvedRun, error: approveError } = await admin
        .from("ai_agent_tool_runs")
        .update({ status: "approved" })
        .eq("id", proposed.id)
        .eq("status", "proposed")
        .select("id,input")
        .maybeSingle();

      if (approveError) throw approveError;
      if (!approvedRun) return Response.json({ error: "Approval request was already consumed." }, { status: 409 });

      input = (approvedRun.input ?? {}) as JsonInput;
      approvedRunId = approvedRun.id;
    }

    let output: JsonInput = {};

    if (tool.tool_type === "knowledge") {
      const q = String(input.query ?? "").trim();
      if (!q || q.length > 1000) return Response.json({ error: "Invalid query" }, { status: 400 });

      const { data, error } = await admin.rpc("search_ai_knowledge_text", {
        p_business_id: tool.business_id,
        p_query: q,
        p_match_count: 10,
      });
      if (error) throw error;
      output = { results: data ?? [] };
    } else if (tool.tool_type === "analytics") {
      const { data, error } = await admin.rpc("ai_business_snapshot", {
        p_business_id: tool.business_id,
        p_question: String(input.question ?? ""),
      });
      if (error) throw error;
      output = { snapshot: data ?? {} };
    } else if (tool.tool_type === "crm") {
      const { data, error } = await admin
        .from("crm_leads")
        .insert({
          business_id: tool.business_id,
          name: String(input.name ?? "AI lead").slice(0, 200),
          source: String(input.source ?? "ai-agent").slice(0, 100),
          status: "new",
          value: Math.max(0, Number(input.value ?? 0)),
        })
        .select("id,name,status,value,created_at")
        .single();
      if (error) throw error;
      output = { lead: data };
    } else if (tool.tool_type === "automation") {
      const { data, error } = await admin
        .from("business_tasks")
        .insert({
          business_id: tool.business_id,
          title: String(input.title ?? "AI task").slice(0, 300),
          priority: ["low", "medium", "high", "urgent"].includes(String(input.priority))
            ? String(input.priority)
            : "medium",
          status: "open",
          due_at: typeof input.due_at === "string" ? input.due_at : null,
        })
        .select("id,title,priority,status,due_at")
        .single();
      if (error) throw error;
      output = { task: data };
    } else {
      return Response.json({ error: "Tool type requires a dedicated server handler" }, { status: 422 });
    }

    const { data: run, error: runError } = await admin
      .from("ai_agent_tool_runs")
      .insert({
        ...runBase,
        input,
        output,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runError) throw runError;

    return Response.json({
      status: "completed",
      runId: approvedRunId ?? run.id,
      executionRunId: run.id,
      output,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Tool execution failed" },
      { status: 500 },
    );
  }
});
