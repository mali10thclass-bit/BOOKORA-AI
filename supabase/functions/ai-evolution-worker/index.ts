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

async function digest(text: string) {
  const bytes = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

function extractText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function discoverModels(text: string) {
  const patterns = [
    /\b(?:GPT[- ]?\d+(?:\.\d+)?(?:[- ][A-Za-z0-9]+)?)\b/gi,
    /\bClaude (?:Opus|Sonnet|Haiku|Fable|Mythos)[- ]?\d+(?:\.\d+)?\b/gi,
    /\bGemini[- ]?\d+(?:\.\d+)?(?:[- ][A-Za-z0-9]+)?\b/gi,
    /\bLlama[- ]?\d+(?:\.\d+)?(?:[- ][A-Za-z0-9]+)?\b/gi,
  ]
  return [...new Set(patterns.flatMap((p) => [...text.matchAll(p)].map((m) => m[0].trim())))]
}

Deno.serve(async (req: Request) => {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })

  const { data: sources, error: sourceError } = await admin
    .from("ai_trainer_sources")
    .select("id,name,source_type,source_url,content_digest,last_fetched_at")
    .eq("enabled", true)

  if (sourceError) return Response.json({ error: sourceError.message }, { status: 500 })

  const { data: run, error: runError } = await admin
    .from("ai_evolution_runs")
    .select("id,business_id,agent_id,trigger")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (runError || !run) return Response.json({ processed: 0, message: runError?.message ?? "No queued evolution run" })

  await admin.from("ai_evolution_runs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", run.id)

  let changed = 0
  let models = 0
  let candidates = 0

  try {
    for (const source of sources ?? []) {
      try {
        const response = await fetch(source.source_url, {
          headers: { "user-agent": "BOOKORA-AI-Evolution/1.0 (+public-source-monitor)" },
          signal: AbortSignal.timeout(15000),
        })
        const html = await response.text()
        const text = extractText(html).slice(0, 12000)
        const previousDigest = source.content_digest
        const hash = await digest(text)
        const isChanged = hash !== previousDigest
        const title = text.slice(0, 220)

        await admin.from("ai_trainer_sources").update({
          last_fetched_at: new Date().toISOString(),
          last_http_status: response.status,
          content_digest: hash,
          last_title: title,
          last_excerpt: text.slice(0, 4000),
          updated_at: new Date().toISOString(),
        }).eq("id", source.id)

        if (!isChanged) continue
        changed += 1

        const found = discoverModels(text)
        for (const model of found) {
          const provider = source.name.split(" ")[0]
          const { error: modelError } = await admin.from("ai_model_catalog").upsert({
            provider,
            model_key: model,
            display_name: model,
            status: "discovered",
            source_url: source.source_url,
            evidence: { source_id: source.id, excerpt: text.slice(0, 1200) },
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "provider,model_key" })
          if (!modelError) models += 1
        }

        const { error: candidateError } = await admin.from("ai_improvement_candidates").insert({
          business_id: run.business_id,
          agent_id: run.agent_id,
          evolution_run_id: run.id,
          improvement_type: "knowledge",
          title: `Review update from ${source.name}`,
          proposal: {
            sourceUrl: source.source_url,
            sourceName: source.name,
            action: "review_public_update_and_refresh_agent_knowledge",
          },
          evidence: {
            digest: hash,
            previousDigest,
            excerpt: text.slice(0, 2500),
          },
          risk_level: "low",
          approval_status: "pending",
        })
        if (!candidateError) candidates += 1
      } catch (error) {
        await admin.from("ai_trainer_sources").update({
          last_fetched_at: new Date().toISOString(),
          last_http_status: 0,
          metadata: { last_error: error instanceof Error ? error.message : String(error) },
        }).eq("id", source.id)
      }
    }

    await admin.from("ai_evolution_runs").update({
      status: "completed",
      sources_scanned: (sources ?? []).length,
      models_discovered: models,
      candidates_created: candidates,
      summary: `Scanned ${(sources ?? []).length} public sources; ${changed} changed; ${models} model observations; ${candidates} improvement candidates.`,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id)

    return Response.json({ run_id: run.id, sources_scanned: (sources ?? []).length, changed, models, candidates })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await admin.from("ai_evolution_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", run.id)
    return Response.json({ error: message, run_id: run.id }, { status: 500 })
  }
})
