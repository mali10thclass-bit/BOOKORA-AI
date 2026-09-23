import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")
const workerSecret = Deno.env.get("BOOKORA_WORKER_SECRET")

if (!supabaseUrl || !secretKey || !workerSecret) {
  throw new Error("Missing worker configuration")
}

const admin = createClient(supabaseUrl, secretKey)
const model = new Supabase.ai.Session("gte-small")

function authorized(req: Request) {
  return req.headers.get("x-bookora-worker-secret") === workerSecret
}

Deno.serve(async (req: Request) => {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })

  const { data: jobs, error: claimError } = await admin.rpc("claim_ai_embedding_chunks", { p_limit: 10 })
  if (claimError) return Response.json({ error: claimError.message }, { status: 500 })

  const completed: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const job of jobs ?? []) {
    try {
      const embedding = await model.run(job.content, { mean_pool: true, normalize: true })
      const { error } = await admin.rpc("finish_ai_embedding", {
        p_chunk_id: job.id,
        p_embedding: embedding,
        p_model: "gte-small",
      })
      if (error) throw error
      completed.push(job.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failed.push({ id: job.id, error: message })
      await admin.rpc("fail_ai_embedding", { p_chunk_id: job.id, p_error: message })
    }
  }

  return Response.json({
    processed: (jobs ?? []).length,
    completed,
    failed,
  })
})
