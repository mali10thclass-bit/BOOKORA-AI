-- BOOKORA AI: verified model intelligence registry
-- Catalogs current provider models from official documentation without auto-switching runtime providers.
-- Runtime compatibility stays false until BOOKORA's actual gateway/provider path is verified.

create table if not exists public.ai_model_comparisons (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_model_catalog(id) on delete cascade,
  benchmark_domain text not null,
  profile_score numeric(5,2),
  notes text,
  source_url text,
  created_at timestamptz not null default now(),
  unique(model_id, benchmark_domain)
);

create index if not exists ai_model_comparisons_model_idx
  on public.ai_model_comparisons(model_id, benchmark_domain);

alter table public.ai_model_comparisons enable row level security;
grant select on public.ai_model_comparisons to authenticated;
revoke insert, update, delete on public.ai_model_comparisons from authenticated;

drop policy if exists ai_model_comparisons_read on public.ai_model_comparisons;
create policy ai_model_comparisons_read
  on public.ai_model_comparisons
  for select to authenticated
  using (true);

insert into public.ai_model_catalog
  (provider, model_key, runtime_model, runtime_compatible, display_name, capabilities, context_window, status, source_url, evidence)
values
  ('OpenAI','gpt-5.6-sol','openai/gpt-5.6-sol',false,'GPT-5.6 Sol',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"flagship"}',1050000,'validated',
   'https://platform.openai.com/docs/models',
   '{"verified_source":"OpenAI Models documentation","verified_at":"2026-09-24"}'),
  ('OpenAI','gpt-5.6-terra','openai/gpt-5.6-terra',false,'GPT-5.6 Terra',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"balanced"}',1050000,'validated',
   'https://platform.openai.com/docs/models',
   '{"verified_source":"OpenAI Models documentation","verified_at":"2026-09-24"}'),
  ('OpenAI','gpt-5.6-luna','openai/gpt-5.6-luna',false,'GPT-5.6 Luna',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"cost_sensitive"}',1050000,'validated',
   'https://platform.openai.com/docs/models',
   '{"verified_source":"OpenAI Models documentation","verified_at":"2026-09-24"}'),
  ('Google','gemini-3.8-flash','gemini-3.8-flash',false,'Gemini 3.8 Flash',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"long_horizon"}',null,'validated',
   'https://ai.google.dev/gemini-api/docs/models',
   '{"verified_source":"Google Gemini API model documentation","verified_at":"2026-09-24"}'),
  ('Google','gemini-3.1-pro','gemini-3.1-pro',false,'Gemini 3.1 Pro',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"advanced"}',null,'validated',
   'https://ai.google.dev/gemini-api/docs/models',
   '{"verified_source":"Google Gemini API model documentation","verified_at":"2026-09-24","lifecycle":"preview"}'),
  ('Google','gemini-embedding-2-preview','gemini-embedding-2-preview',false,'Gemini Embedding 2',
   '{"embedding":true,"multimodal":true,"rag":true,"profile":"multimodal_embedding"}',null,'validated',
   'https://ai.google.dev/gemini-api/docs/models',
   '{"verified_source":"Google Gemini API model documentation","verified_at":"2026-09-24","lifecycle":"preview"}'),
  ('Anthropic','claude-opus-4-8','claude-opus-4-8',false,'Claude Opus 4.8',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"high_capability"}',null,'validated',
   'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
   '{"verified_source":"Anthropic model lifecycle documentation","verified_at":"2026-09-24"}'),
  ('Anthropic','claude-sonnet-5','claude-sonnet-5',false,'Claude Sonnet 5',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"general"}',null,'validated',
   'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
   '{"verified_source":"Anthropic model lifecycle documentation","verified_at":"2026-09-24"}'),
  ('Anthropic','claude-sonnet-4-6','claude-sonnet-4-6',false,'Claude Sonnet 4.6',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"general"}',null,'validated',
   'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
   '{"verified_source":"Anthropic model lifecycle documentation","verified_at":"2026-09-24"}'),
  ('Anthropic','claude-haiku-4-5-20251001','claude-haiku-4-5-20251001',false,'Claude Haiku 4.5',
   '{"reasoning":true,"coding":true,"agentic":true,"multimodal":true,"profile":"fast"}',null,'validated',
   'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
   '{"verified_source":"Anthropic model lifecycle documentation","verified_at":"2026-09-24"}'),
  ('Groq','openai/gpt-oss-120b','openai/gpt-oss-120b',false,'GPT OSS 120B via Groq',
   '{"reasoning":true,"coding":true,"agentic":true,"tool_use":true,"profile":"fast_open_weight"}',131072,'validated',
   'https://console.groq.com/docs/models',
   '{"verified_source":"Groq supported models documentation","verified_at":"2026-09-24"}'),
  ('Groq','openai/gpt-oss-20b','openai/gpt-oss-20b',false,'GPT OSS 20B via Groq',
   '{"reasoning":true,"coding":true,"agentic":true,"tool_use":true,"profile":"very_fast_open_weight"}',131072,'validated',
   'https://console.groq.com/docs/models',
   '{"verified_source":"Groq supported models documentation","verified_at":"2026-09-24"}'),
  ('Groq','qwen/qwen3.8-27b','qwen/qwen3.8-27b',false,'Qwen 3.8 27B via Groq',
   '{"reasoning":true,"coding":true,"agentic":true,"tool_use":true,"multimodal":true,"profile":"fast_multimodal"}',131042,'validated',
   'https://console.groq.com/docs/models',
   '{"verified_source":"Groq supported models documentation","verified_at":"2026-09-24"}')
on conflict (provider, model_key) do update set
  runtime_model=excluded.runtime_model,
  display_name=excluded.display_name,
  capabilities=excluded.capabilities,
  context_window=excluded.context_window,
  status=excluded.status,
  source_url=excluded.source_url,
  evidence=excluded.evidence,
  last_seen_at=now(),
  updated_at=now();

insert into public.ai_model_comparisons (model_id, benchmark_domain, profile_score, notes, source_url)
select m.id, x.domain, x.score, x.notes, m.source_url
from public.ai_model_catalog m
join (values
  ('OpenAI','gpt-5.6-sol','reasoning',98,'Flagship reasoning/coding profile from provider documentation'),
  ('OpenAI','gpt-5.6-sol','coding',98,'Flagship professional coding profile from provider documentation'),
  ('OpenAI','gpt-5.6-terra','reasoning',93,'Balanced reasoning profile from provider documentation'),
  ('OpenAI','gpt-5.6-luna','cost_efficiency',95,'Cost-sensitive workload profile from provider documentation'),
  ('Google','gemini-3.8-flash','agentic',97,'Long-horizon software engineering and autonomous-agent profile'),
  ('Google','gemini-3.8-flash','coding',96,'Software engineering profile'),
  ('Google','gemini-3.1-pro','reasoning',98,'Advanced intelligence and complex problem-solving profile'),
  ('Google','gemini-embedding-2-preview','rag',98,'Multimodal embedding profile'),
  ('Anthropic','claude-opus-4-8','reasoning',98,'Active high-capability model in lifecycle documentation'),
  ('Anthropic','claude-sonnet-5','coding',97,'Active coding/general model in lifecycle documentation'),
  ('Anthropic','claude-sonnet-4-6','coding',95,'Active coding/general model in lifecycle documentation'),
  ('Anthropic','claude-haiku-4-5-20251001','speed',97,'Active lower-latency model profile'),
  ('Groq','openai/gpt-oss-120b','speed',95,'Groq documents approximately 500 tokens/sec'),
  ('Groq','openai/gpt-oss-20b','speed',99,'Groq documents approximately 1000 tokens/sec'),
  ('Groq','qwen/qwen3.8-27b','agentic',94,'Groq documents thinking, instruct, tool use and JSON mode')
) as x(provider,model_key,domain,score,notes)
on m.provider=x.provider and m.model_key=x.model_key
on conflict (model_id, benchmark_domain) do update set
  profile_score=excluded.profile_score,
  notes=excluded.notes,
  source_url=excluded.source_url;

create or replace function public.ai_model_comparison_catalog()
returns table (
  provider text,
  model_key text,
  display_name text,
  status text,
  runtime_compatible boolean,
  context_window integer,
  capabilities jsonb,
  comparison_profiles jsonb,
  source_url text
)
language sql
security definer
set search_path=public
as $$
  select
    m.provider,
    m.model_key,
    m.display_name,
    m.status,
    m.runtime_compatible,
    m.context_window,
    m.capabilities,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'domain', c.benchmark_domain,
          'score', c.profile_score,
          'notes', c.notes
        ) order by c.benchmark_domain
      ) filter (where c.id is not null),
      '[]'::jsonb
    ) as comparison_profiles,
    m.source_url
  from public.ai_model_catalog m
  left join public.ai_model_comparisons c on c.model_id=m.id
  where m.status <> 'blocked'
  group by m.id
  order by m.provider, m.display_name;
$$;

revoke all on function public.ai_model_comparison_catalog() from public;
grant execute on function public.ai_model_comparison_catalog() to authenticated;
