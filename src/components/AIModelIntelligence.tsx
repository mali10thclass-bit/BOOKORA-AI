import { useEffect, useMemo, useState } from "react";
import { BarChart3, ExternalLink, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ModelRow = {
  provider: string;
  model_key: string;
  display_name: string;
  status: string;
  runtime_compatible: boolean;
  context_window: number | null;
  capabilities: Record<string, unknown>;
  comparison_profiles: { domain: string; score: number | null; notes: string | null }[];
  source_url: string | null;
};

export function AIModelIntelligence() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("ai_model_comparison_catalog");
      if (error) {
        console.error("[model-intelligence]", error.message);
        return;
      }
      const rows = (data ?? []) as ModelRow[];
      setModels(rows);
      if (!left && rows[0]) setLeft(rows[0].model_key);
      if (!right && rows[1]) setRight(rows[1].model_key);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selected = useMemo(
    () => [models.find((m) => m.model_key === left), models.find((m) => m.model_key === right)].filter(Boolean) as ModelRow[],
    [models, left, right],
  );

  const profileMap = (model: ModelRow) => new Map(model.comparison_profiles.map((p) => [p.domain, p]));
  const domains = useMemo(() => {
    const all = selected.flatMap((m) => m.comparison_profiles.map((p) => p.domain));
    return [...new Set(all)];
  }, [selected]);

  return (
    <section className="card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-600" />
            <h2 className="font-semibold">Model Intelligence</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Provider-aware model catalog and side-by-side capability profiles. Scores are documentation-derived profiles, not independent benchmark results.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => void load()} disabled={busy}>
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh catalog
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[["Primary model", left, setLeft], ["Compare with", right, setRight]].map(([label, value, setter]) => (
          <label key={label as string} className="text-sm font-medium">
            {label as string}
            <select
              className="input mt-2"
              value={value as string}
              onChange={(e) => (setter as (value: string) => void)(e.target.value)}
            >
              {models.map((m) => <option key={m.model_key} value={m.model_key}>{m.provider} · {m.display_name}</option>)}
            </select>
          </label>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left dark:border-gray-800">
                <th className="p-2">Attribute</th>
                {selected.map((m) => <th className="p-2" key={m.model_key}>{m.display_name}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b dark:border-gray-800">
                <td className="p-2 font-medium">Provider</td>
                {selected.map((m) => <td className="p-2" key={m.model_key}>{m.provider}</td>)}
              </tr>
              <tr className="border-b dark:border-gray-800">
                <td className="p-2 font-medium">Lifecycle</td>
                {selected.map((m) => <td className="p-2 capitalize" key={m.model_key}>{m.status}</td>)}
              </tr>
              <tr className="border-b dark:border-gray-800">
                <td className="p-2 font-medium">Runtime ready</td>
                {selected.map((m) => <td className="p-2" key={m.model_key}>{m.runtime_compatible ? "Verified" : "Not verified"}</td>)}
              </tr>
              <tr className="border-b dark:border-gray-800">
                <td className="p-2 font-medium">Context</td>
                {selected.map((m) => <td className="p-2" key={m.model_key}>{m.context_window ? m.context_window.toLocaleString() : "Provider-specific / not cataloged"}</td>)}
              </tr>
              {domains.map((domain) => (
                <tr className="border-b dark:border-gray-800" key={domain}>
                  <td className="p-2 font-medium capitalize">{domain.replaceAll("_", " ")}</td>
                  {selected.map((m) => {
                    const p = profileMap(m).get(domain);
                    return <td className="p-2" key={m.model_key}>{p?.score ?? "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {selected.map((m) => (
          <div key={m.model_key} className="rounded-xl border p-3 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium"><BarChart3 size={15} /> {m.provider} · {m.display_name}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(m.capabilities).filter(([, value]) => value === true).map(([key]) => (
                <span key={key} className="rounded-full bg-gray-100 px-2 py-1 text-[10px] dark:bg-gray-800">{key}</span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={13} />
              {m.runtime_compatible ? "Runtime compatibility verified" : "Catalog verified; runtime compatibility still requires gateway/provider verification"}
            </div>
            {m.source_url && <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600" href={m.source_url} target="_blank" rel="noreferrer">Official source <ExternalLink size={12} /></a>}
          </div>
        ))}
      </div>
    </section>
  );
}
