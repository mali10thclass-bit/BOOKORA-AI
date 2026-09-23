import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS");
if (!url || !key) throw new Error("Missing configuration");
const admin = createClient(url, key);
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const auth = req.headers.get("authorization") ?? ""; const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Authentication required" }, { status: 401 });
    const { data: userData } = await admin.auth.getUser(token); if (!userData.user) return Response.json({ error: "Authentication required" }, { status: 401 });
    const body = await req.json(); const toolId = String(body.toolId ?? ""); const input = (body.input ?? {}) as Record<string, unknown>;
    if (!toolId) return Response.json({ error: "toolId required" }, { status: 400 });
    const { data: tool } = await admin.from("ai_agent_tools").select("id,business_id,agent_id,name,description,tool_type,config,approval_required,enabled").eq("id", toolId).eq("enabled", true).maybeSingle();
    if (!tool) return Response.json({ error: "Tool not found" }, { status: 404 });
    const { data: member } = await admin.from("business_members").select("business_id").eq("business_id", tool.business_id).eq("user_id", userData.user.id).maybeSingle();
    if (!member) return Response.json({ error: "Not authorized" }, { status: 403 });
    const runBase = { business_id: tool.business_id, agent_id: tool.agent_id, tool_id: tool.id, actor_user_id: userData.user.id, source: "agent" };
    if (tool.approval_required && body.approved !== true) {
      const { data: run } = await admin.from("ai_agent_tool_runs").insert({ ...runBase, input, status: "proposed", output: {} }).select("id").single();
      return Response.json({ status: "approval_required", runId: run?.id ?? null });
    }
    let output: Record<string, unknown> = {};
    if (tool.tool_type === "knowledge") {
      const q = String(input.query ?? ""); if (!q || q.length > 1000) return Response.json({ error: "Invalid query" }, { status: 400 });
      const { data, error } = await admin.rpc("search_ai_knowledge_text", { p_business_id: tool.business_id, p_query: q, p_match_count: 10 }); if (error) throw error;
      output = { results: data ?? [] };
    } else if (tool.tool_type === "analytics") {
      const { data, error } = await admin.rpc("ai_business_snapshot", { p_business_id: tool.business_id, p_question: String(input.question ?? "") }); if (error) throw error;
      output = { snapshot: data ?? {} };
    } else if (tool.tool_type === "crm") {
      const { data, error } = await admin.from("crm_leads").insert({ business_id: tool.business_id, name: String(input.name ?? "AI lead").slice(0,200), source: String(input.source ?? "ai-agent").slice(0,100), status: "new", value: Math.max(0, Number(input.value ?? 0)) }).select("id,name,status,value,created_at").single(); if (error) throw error; output = { lead: data };
    } else if (tool.tool_type === "automation") {
      const { data, error } = await admin.from("business_tasks").insert({ business_id: tool.business_id, title: String(input.title ?? "AI task").slice(0,300), priority: ["low","medium","high","urgent"].includes(String(input.priority)) ? String(input.priority) : "medium", status: "open", due_at: typeof input.due_at === "string" ? input.due_at : null }).select("id,title,priority,status,due_at").single(); if (error) throw error; output = { task: data };
    } else { return Response.json({ error: "Tool type requires a dedicated server handler" }, { status: 422 }); }
    const { data: run } = await admin.from("ai_agent_tool_runs").insert({ ...runBase, input, output, status: "completed", completed_at: new Date().toISOString() }).select("id").single();
    return Response.json({ status: "completed", runId: run?.id ?? null, output });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Tool execution failed" }, { status: 500 }); }
});