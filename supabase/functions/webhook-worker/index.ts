import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")!
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")
const workerSecret = Deno.env.get("BOOKORA_WORKER_SECRET")
if (!url || !key || !workerSecret) throw new Error("Missing worker configuration")

const admin = createClient(url, key)
const encoder = new TextEncoder()

function authorized(req: Request) {
  return req.headers.get("x-bookora-worker-secret") === workerSecret
}

async function hmac(secret: string, body: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(body))
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

Deno.serve(async (req: Request) => {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 })

  const { data: rows, error } = await admin
    .from("webhook_deliveries")
    .select("id,business_id,webhook_id,event_type,payload,attempt_count")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(20)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results: Array<Record<string, unknown>> = []

  for (const row of rows ?? []) {
    const claim = await admin
      .from("webhook_deliveries")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle()

    if (claim.error || !claim.data) continue

    const { data: webhook } = await admin
      .from("webhooks")
      .select("endpoint_url,secret,is_active")
      .eq("id", row.webhook_id)
      .eq("business_id", row.business_id)
      .maybeSingle()

    if (!webhook?.is_active) {
      await admin.from("webhook_deliveries").update({
        status: "dead",
        last_error: "Webhook is inactive or missing",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      results.push({ id: row.id, status: "dead" })
      continue
    }

    const body = JSON.stringify({
      id: row.id,
      type: row.event_type,
      created_at: new Date().toISOString(),
      data: row.payload,
    })

    try {
      const signature = await hmac(webhook.secret, body)
      const response = await fetch(webhook.endpoint_url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "BOOKORA-AI-Webhook/1.0",
          "x-bookora-event": row.event_type,
          "x-bookora-signature": `sha256=${signature}`,
        },
        body,
      })

      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`)

      await admin.from("webhook_deliveries").update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", row.id)

      results.push({ id: row.id, status: "delivered" })
    } catch (error) {
      const attempts = Number(row.attempt_count ?? 0) + 1
      const dead = attempts >= 8
      const delaySeconds = Math.min(3600, 2 ** Math.min(attempts, 10))
      await admin.from("webhook_deliveries").update({
        status: dead ? "dead" : "failed",
        attempt_count: attempts,
        last_error: error instanceof Error ? error.message : String(error),
        next_attempt_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      results.push({ id: row.id, status: dead ? "dead" : "failed", attempts })
    }
  }

  return Response.json({ processed: results.length, results })
})
