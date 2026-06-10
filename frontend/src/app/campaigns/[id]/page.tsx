"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCampaign, getCampaignInsights } from "@/lib/api";
import type { Campaign } from "@/lib/types";

const CHANNEL_ICONS: Record<string, string> = { whatsapp: "💬", sms: "📱", email: "📧", rcs: "🔵" };

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: "width 0.5s ease" }} />
      </div>
      <span className="text-xs font-mono text-slate-500 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCampaign = useCallback(() => {
    getCampaign(Number(id)).then(setCampaign);
  }, [id]);

  useEffect(() => {
    getCampaign(Number(id))
      .then(setCampaign)
      .finally(() => setLoading(false));
  }, [id]);

  // Poll every 3 seconds until all messages are resolved (delivered or failed)
  const pendingCallbacks =
    campaign !== null &&
    campaign.stats.sent > 0 &&
    campaign.stats.delivered + campaign.stats.failed < campaign.stats.sent;

  useEffect(() => {
    if (!pendingCallbacks) return;
    const interval = setInterval(loadCampaign, 3000);
    return () => clearInterval(interval);
  }, [pendingCallbacks, loadCampaign]);

  const handleInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await getCampaignInsights(Number(id));
      setInsights(res.insights);
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading...</div>;
  if (!campaign) return <div className="p-8 text-slate-400">Campaign not found.</div>;

  const { stats } = campaign;
  const sent = stats.sent;

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">
        ← Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{CHANNEL_ICONS[campaign.channel] ?? "📨"}</span>
            <h1 className="text-2xl font-bold text-slate-800">{campaign.name}</h1>
          </div>
          <p className="text-slate-500 text-sm">
            {campaign.segment_name} · {campaign.channel.toUpperCase()} ·{" "}
            {new Date(campaign.created_at.replace(" ", "T")).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            campaign.status === "completed"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {campaign.status === "running" && (
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1.5 animate-pulse" />
          )}
          {campaign.status}
        </span>
      </div>

      {/* Message */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
        <p className="text-xs font-medium text-slate-500 mb-1">Message</p>
        <p className="text-slate-700 text-sm">{campaign.message}</p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-700">Delivery Analytics</h2>
          {pendingCallbacks && (
            <span className="text-xs text-amber-600 font-medium animate-pulse">Live updating…</span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: "Sent", value: stats.sent, color: "text-slate-700" },
            { label: "Delivered", value: stats.delivered, color: "text-blue-600" },
            { label: "Failed", value: stats.failed, color: "text-rose-500" },
            { label: "Opened", value: stats.opened, color: "text-indigo-600" },
            { label: "Clicked", value: stats.clicked, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="text-center bg-slate-50 rounded-lg p-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {[
            { label: "Delivery Rate", value: stats.delivered, color: "bg-blue-500" },
            { label: "Open Rate", value: stats.opened, color: "bg-indigo-500" },
            { label: "Click Rate", value: stats.clicked, color: "bg-emerald-500" },
            { label: "Failure Rate", value: stats.failed, color: "bg-rose-400" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-sm text-slate-500 w-28 shrink-0">{row.label}</span>
              <ProgressBar value={row.value} max={sent} color={row.color} />
              <span className="text-sm font-mono text-slate-700 w-8">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-slate-700">AI Insights</h2>
            <p className="text-xs text-slate-400 mt-0.5">Powered by Groq · llama-3.3-70b</p>
          </div>
          <button
            onClick={handleInsights}
            disabled={insightsLoading || stats.sent === 0}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {insightsLoading ? "Analysing..." : "✨ Generate Insights"}
          </button>
        </div>

        {insights ? (
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <p className="text-sm text-indigo-800 leading-relaxed">{insights}</p>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            {stats.sent === 0
              ? "Campaign is still launching..."
              : "Click Generate Insights for an AI summary of this campaign's performance."}
          </p>
        )}
      </div>
    </div>
  );
}
