import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")
const workerSecret = Deno.env.get("BOOKORA_WORKER_SECRET")
if (!url || !key || !workerSecret) throw new Error("Missing worker configuration")

const admin = createClient(url, key)

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" || req.headers.get("x-bookora-worker-secret") !== workerSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const { data: schedules, error } = await admin
    .from("ai_agent_schedules")
    .select("id,business_id,agent_id,prompt,interval_minutes,next_run_at")
    .eq("enabled", true)
    .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`)
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  let queued = 0
  for (const schedule of schedules ?? []) {
    const { data: claimed } = await admin
      .from("ai_agent_schedules")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: new Date(now.getTime() + Number(schedule.interval_minutes ?? 1440) * 60_000).toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", schedule.id)
      .eq("enabled", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`)
      .select("id")
      .maybeSingle()

    if (!claimed) continue

    const { error: insertError } = await admin.from("ai_evolution_runs").insert({
      business_id: schedule.business_id,
      agent_id: schedule.agent_id,
      status: "queued",
      trigger: "scheduled",
    })

    if (!insertError) queued += 1
  }

  return Response.json({ schedules_checked: schedules?.length ?? 0, queued })
})
