import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS");
const workerSecret = Deno.env.get("BOOKORA_WORKER_SECRET");
const lovableKey = Deno.env.get("LOVABLE_API_KEY");
if (!url || !key || !workerSecret) throw new Error("Missing worker configuration");
const admin = createClient(url,key);

function ok(req:Request){return req.headers.get("x-bookora-worker-secret")===workerSecret}
function criteriaPass(output:string,c:any){
  const checks:boolean[]=[];
  if(typeof c?.exact==="string") checks.push(output.trim()===c.exact.trim());
  if(Array.isArray(c?.contains_any)&&c.contains_any.length) checks.push(c.contains_any.some((x:string)=>output.toLowerCase().includes(x.toLowerCase())));
  if(Array.isArray(c?.contains_all)&&c.contains_all.length) checks.push(c.contains_all.every((x:string)=>output.toLowerCase().includes(x.toLowerCase())));
  if(typeof c?.regex==="string"){try{checks.push(new RegExp(c.regex,"i").test(output))}catch{checks.push(false)}}
  if(typeof c?.max_length==="number") checks.push(output.length<=c.max_length);
  if(Array.isArray(c?.must_not_contain)&&c.must_not_contain.length) checks.push(!c.must_not_contain.some((x:string)=>output.toLowerCase().includes(x.toLowerCase())));
  const passed=checks.length>0 && checks.every(Boolean);
  return {passed,score:checks.length?checks.filter(Boolean).length/checks.length:0,feedback:checks.length?(passed?"passed":"one or more deterministic criteria failed"):"no deterministic criteria"};
}
Deno.serve(async(req)=>{
  if(!ok(req)) return Response.json({error:"Unauthorized"},{status:401});
  if(req.method!=="POST") return Response.json({error:"Method not allowed"},{status:405});
  if(!lovableKey) return Response.json({error:"LOVABLE_API_KEY missing"},{status:503});
  const {data:runs,error}=await admin.rpc("claim_ai_eval_runs",{p_limit:3});
  if(error) return Response.json({error:error.message},{status:500});
  let processed=0;
  for(const run of runs??[]){
    try{
      const [{data:agent},{data:cases}]=await Promise.all([
        admin.from("ai_agents").select("id,name,system_prompt,model").eq("id",run.agent_id).eq("business_id",run.business_id).maybeSingle(),
        admin.from("ai_agent_eval_cases").select("id,input,expected_criteria").eq("agent_id",run.agent_id).eq("business_id",run.business_id).eq("enabled",true).order("created_at")
      ]);
      if(!agent) throw new Error("Agent not found");
      const results:any[]=[];
      for(const c of cases??[]){
        try{
          const response=await fetch("https://ai.gateway.lovable.dev/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+lovableKey,"Lovable-API-Key":lovableKey},body:JSON.stringify({model:agent.model??"openai/gpt-4o-mini",messages:[{role:"system",content:["You are being evaluated as a BOOKORA AI business agent.","Never invent business facts.",agent.system_prompt??""].join("\n")},{role:"user",content:c.input}],temperature:0.1})});
          if(!response.ok) throw new Error("AI provider returned "+response.status);
          const payload=await response.json();
          const output=String(payload?.choices?.[0]?.message?.content??"").trim();
          const check=criteriaPass(output,c.expected_criteria??{});
          results.push({caseId:c.id,input:c.input,output,...check});
        }catch(e){results.push({caseId:c.id,input:c.input,output:"",passed:false,score:0,feedback:e instanceof Error?e.message:String(e)})}
      }
      for(const r of results) await admin.from("ai_agent_eval_results").insert({run_id:run.id,business_id:run.business_id,agent_id:run.agent_id,case_id:r.caseId,input:r.input,output:r.output,passed:r.passed,score:r.score,feedback:r.feedback});
      const score=results.length?results.reduce((s,r)=>s+r.score,0)/results.length:0;
      const passed=results.filter(r=>r.passed).length;
      await admin.from("ai_agent_eval_runs").update({status:"completed",case_count:results.length,passed_count:passed,score,summary:`Evaluated ${results.length} cases; ${passed} fully passed; deterministic score ${score.toFixed(4)}.`,completed_at:new Date().toISOString()}).eq("id",run.id);
      processed++;
    }catch(e){await admin.from("ai_agent_eval_runs").update({status:"failed",error:e instanceof Error?e.message:String(e),completed_at:new Date().toISOString()}).eq("id",run.id)}
  }
  return Response.json({processed});
});