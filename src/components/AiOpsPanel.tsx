import { useCallback, useEffect, useState } from "react";
import { Activity, HeartPulse, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getAiAgentAnalytics, getAiProviderDiagnostics } from "@/lib/ai-ops.functions";
import type { AiAgentAnalytics } from "@/lib/ai-ops.functions";

interface Diagnostics {
  runtime: {
    provider: string;
    mode: string;
    model: string;
    baseUrl: string;
    timeoutMs: number;
    maxRetries: number;
    providerSource: string;
    apiKeyConfigured: boolean;
  };
  health: {
    ok: boolean;
    provider: string;
    baseUrl: string;
    model: string;
    latencyMs: number;
    errorCategory: string | null;
    detail: string | null;
  };
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
    </div>
  );
}

/**
 * Real-data AI operations overview: analytics derived from stored rows plus
 * a live provider health probe. No invented metrics.
 */
export function AiOpsPanel() {
  const fetchAnalytics = useServerFn(getAiAgentAnalytics);
  const fetchDiagnostics = useServerFn(getAiProviderDiagnostics);
  const [analytics, setAnalytics] = useState<AiAgentAnalytics | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, d] = await Promise.all([fetchAnalytics({}), fetchDiagnostics({})]);
      if (a.analytics) setAnalytics(a.analytics);
      if (d.diagnostics) setDiagnostics(d.diagnostics as unknown as Diagnostics);
      setError(a.error ?? d.error ?? null);
    } catch {
      setError("Could not load AI operations data.");
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics, fetchDiagnostics]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity size={18} />
          <h2 className="font-semibold">AI analytics &amp; provider health</h2>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="text-xs inline-flex items-center gap-1 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 hover:border-primary-300 transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {diagnostics && (
        <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1 font-medium">
            <HeartPulse size={14} className={diagnostics.health.ok ? "text-green-600" : "text-amber-600"} />
            {diagnostics.health.ok ? "Provider reachable" : "Provider unreachable"}
          </span>
          <span>
            {diagnostics.runtime.provider} · {diagnostics.runtime.model}
          </span>
          <span className="text-gray-500">{diagnostics.runtime.baseUrl}</span>
          <span className="text-gray-500">latency {diagnostics.health.latencyMs}ms</span>
          <span className="text-gray-500">
            timeout {diagnostics.runtime.timeoutMs}ms · retries {diagnostics.runtime.maxRetries}
          </span>
          {!diagnostics.health.ok && diagnostics.health.errorCategory && (
            <span className="text-amber-600">{diagnostics.health.errorCategory}</span>
          )}
        </div>
      )}

      {analytics && (
        <>
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mt-4">Conversations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            <Stat label="Total" value={analytics.conversations.total} />
            <Stat label="Active" value={analytics.conversations.active} />
            <Stat label="Messages" value={analytics.conversations.messages} />
            <Stat label="AI / human turns" value={`${analytics.conversations.aiMessages} / ${analytics.conversations.humanMessages}`} />
          </div>

          <h3 className="text-xs uppercase tracking-wide text-gray-400 mt-4">Tools &amp; actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            <Stat label="Tool runs" value={analytics.toolRuns.total} />
            <Stat label="Completed / failed" value={`${analytics.toolRuns.completed} / ${analytics.toolRuns.failed}`} />
            <Stat label="Proposals awaiting confirmation" value={analytics.actionRequests.pending} />
            <Stat label="Approved / rejected" value={`${analytics.actionRequests.approved} / ${analytics.actionRequests.rejected}`} />
          </div>

          <h3 className="text-xs uppercase tracking-wide text-gray-400 mt-4">Handoff &amp; evaluation</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            <Stat label="Handoffs" value={analytics.handoffs.total} />
            <Stat label="Pending handoffs" value={analytics.handoffs.pending} />
            <Stat label="Knowledge sources" value={analytics.knowledgeSources.total} />
            <Stat
              label="Last eval score"
              value={
                analytics.evaluations.lastRunScore !== null
                  ? `${(analytics.evaluations.lastRunScore * 100).toFixed(0)}% (${analytics.evaluations.lastRunPassed ?? 0}/${analytics.evaluations.lastRunCases ?? 0})`
                  : null
              }
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Generated {analytics.generatedAt} from stored application data only.
          </p>
        </>
      )}
    </section>
  );
}
