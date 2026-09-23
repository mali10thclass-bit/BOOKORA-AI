import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL"); const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??Deno.env.get("SUPABASE_SECRET_KEYS"); const secret=Deno.env.get("BOOKORA_WORKER_SECRET"); const lovable=Deno.env.get("LOVABLE_API_KEY");
if(!url||!key||!secret)throw new Error("Missing worker configuration"); const admin=createClient(url,key);
const textTypes=new Set(["app","website","software","document","research","automation"]);
Deno.serve(async(req)=>{if(req.headers.get("x-bookora-worker-secret")!==secret)return Response.json({error:"Unauthorized"},{status:401});if(req.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
 const {data:jobs,error}=await admin.rpc("claim_ai_generation_jobs",{p_limit:3});if(error)return Response.json({error:error.message},{status:500});
 let processed=0;for(const job of jobs??[]){try{
   if(!textTypes.has(job.job_type)){throw new Error("No generation provider configured for "+job.job_type+"; configure a dedicated media provider before enabling this job type.");}
   if(!lovable)throw new Error("LOVABLE_API_KEY missing");
   const response=await fetch("https://ai.gateway.lovable.dev/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+lovable,"Lovable-API-Key":lovable},body:JSON.stringify({model:"openai/gpt-4o-mini",messages:[{role:"system",content:"You are BOOKORA AI Generation Worker. Produce structured, production-oriented output. Do not claim files or deployments exist unless actually generated. Return JSON with title,summary,deliverables,next_steps."},{role:"user",content:`Generation type: ${job.job_type}\nPrompt: ${job.prompt}\nInput context: ${JSON.stringify(job.input??{})}`}],temperature:0.2,response_format:{type:"json_object"}})});
   if(!response.ok)throw new Error("AI provider returned "+response.status);
   const payload=await response.json();let output=payload?.choices?.[0]?.message?.content??"{}";try{output=JSON.parse(output)}catch{output={content:String(output)}}
   await admin.rpc("complete_ai_generation_job",{p_job_id:job.id,p_output:{provider:"lovable",model:"openai/gpt-4o-mini",result:output}});processed++;
 }catch(e){await admin.rpc("fail_ai_generation_job",{p_job_id:job.id,p_error:e instanceof Error?e.message:String(e)})}}
 return Response.json({processed,claimed:(jobs??[]).length});
});