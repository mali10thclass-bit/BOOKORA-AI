import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const workerSecret = Deno.env.get("BOOKORA_WORKER_SECRET")!;

Deno.serve(async (req) => {
  if (req.headers.get("x-bookora-worker-secret") !== workerSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: runs, error } = await admin.rpc("claim_ai_model_benchmark_runs", { p_limit: 5 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // The worker intentionally claims jobs but does not fake provider results.
  // Real provider execution is enabled only after a provider adapter and credential
  // are explicitly configured and verified for that model.
  for (const run of runs ?? []) {
    await admin.from("ai_model_benchmark_runs").update({
      status: "failed",
      error: "No verified provider adapter is configured for this model.",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
  }

  return Response.json({
    claimed: runs?.length ?? 0,
    completed: 0,
    failed: runs?.length ?? 0,
    reason: "provider adapter verification required",
  });
});
