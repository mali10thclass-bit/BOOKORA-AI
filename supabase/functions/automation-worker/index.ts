import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")!
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")
const workerSecret = Deno.env.get("BOOKORA_WORKER_SECRET")
if (!url || !key || !workerSecret) throw new Error("Missing worker configuration")

const admin = createClient(url, key)

function authorized(req: Request) {
  return req.headers.get("x-bookora-worker-secret") === workerSecret
}

Deno.serve(async (req: Request) => {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })

  const { data: runs, error } = await admin
    .from("automation_runs")
    .select("id, business_id, workflow_id, input")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(10)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results: Array<Record<string, unknown>> = []

  for (const run of runs ?? []) {
    const { data: claimed, error: claimError } = await admin.rpc("claim_automation_run", { p_run_id: run.id })
    if (claimError) continue

    try {
      const { data: workflow, error: workflowError } = await admin
        .from("automation_workflows")
        .select("definition")
        .eq("id", run.workflow_id)
        .eq("business_id", run.business_id)
        .maybeSingle()
      if (workflowError || !workflow) throw workflowError ?? new Error("Workflow not found")

      const definition = (workflow.definition ?? {}) as { steps?: Array<Record<string, unknown>> }
      const outputs: unknown[] = []

      for (const step of definition.steps ?? []) {
        const type = String(step.type ?? "")
        if (type === "create_task") {
          const { data, error: stepError } = await admin.rpc("create_business_task", {
            p_business_id: run.business_id,
            p_title: String(step.title ?? "Automation task"),
            p_priority: String(step.priority ?? "normal"),
            p_due_at: step.due_at ? String(step.due_at) : null,
          })
          if (stepError) throw stepError
          outputs.push({ type, data })
        } else if (type === "inventory_adjustment") {
          const { data, error: stepError } = await admin.rpc("record_inventory_movement", {
            p_business_id: run.business_id,
            p_product_id: String(step.product_id),
            p_quantity_delta: Number(step.quantity_delta),
            p_reason: String(step.reason ?? "Automation adjustment"),
          })
          if (stepError) throw stepError
          outputs.push({ type, data })
        } else {
          throw new Error(`Unsupported automation step: ${type}`)
        }
      }

      await admin
        .from("automation_runs")
        .update({ status: "completed", output: { steps: outputs }, finished_at: new Date().toISOString() })
        .eq("id", run.id)

      results.push({ id: run.id, status: "completed", claimed })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await admin
        .from("automation_runs")
        .update({ status: "failed", output: { error: message }, finished_at: new Date().toISOString() })
        .eq("id", run.id)
      results.push({ id: run.id, status: "failed", error: message })
    }
  }

  return Response.json({ processed: results.length, results })
})
