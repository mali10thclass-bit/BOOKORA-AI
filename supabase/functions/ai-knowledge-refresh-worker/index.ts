import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS");
const workerSecret = Deno.env.get("BOOKORA_WORKER_SECRET");
if (!url || !key || !workerSecret) throw new Error("Missing worker configuration");
const admin = createClient(url, key);

function authorized(req: Request) { return req.headers.get("x-bookora-worker-secret") === workerSecret; }

async function digest(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function isSafeRefreshUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    if (u.port && u.port !== "443") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h === "0.0.0.0" || h === "127.0.0.1" || h === "::1") return false;
    if (/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h)) return false;
    if (h.includes(":") && !h.startsWith("[2001:")) return false;
    return true;
  } catch { return false; }
}

function extractText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/g," ").replace(/&amp;/g,"&")
    .replace(/\s+/g," ").trim().slice(0,100000);
}

Deno.serve(async (req: Request) => {
  if (!authorized(req)) return Response.json({error:"Unauthorized"},{status:401});
  if (req.method !== "POST") return Response.json({error:"Method not allowed"},{status:405});

  const {data: jobs,error: claimError}=await admin.rpc("claim_ai_knowledge_refresh_job",{p_limit:10});
  if (claimError) return Response.json({error:claimError.message},{status:500});

  const results=[];
  for (const job of jobs ?? []) {
    try {
      if (!job.source_url || !isSafeRefreshUrl(job.source_url)) throw new Error("Source URL is not an allowed HTTPS public URL");
      const response=await fetch(job.source_url,{headers:{"user-agent":"BOOKORA-AI-KnowledgeRefresh/1.0"},signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
      const content=extractText(await response.text());
      if (!content) throw new Error("Source returned no usable text");
      const newDigest=await digest(content);
      const changed=newDigest !== job.current_digest;

      if (changed) {
        const {error:updateError}=await admin.from("ai_knowledge_sources")
          .update({content,updated_at:new Date().toISOString()}).eq("id",job.source_id).eq("business_id",job.business_id);
        if (updateError) throw updateError;
        const {error:indexError}=await admin.rpc("index_ai_knowledge_source",{p_source_id:job.source_id});
        if (indexError) throw indexError;
      }

      const {error:finishError}=await admin.rpc("finish_ai_knowledge_refresh",{p_job_id:job.id,p_digest:newDigest,p_changed:changed});
      if (finishError) throw finishError;
      results.push({job_id:job.id,source_id:job.source_id,changed});
    } catch(error) {
      const message=error instanceof Error ? error.message : String(error);
      await admin.rpc("fail_ai_knowledge_refresh",{p_job_id:job.id,p_error:message});
      results.push({job_id:job.id,source_id:job.source_id,error:message});
    }
  }
  return Response.json({processed:results.length,results});
});
