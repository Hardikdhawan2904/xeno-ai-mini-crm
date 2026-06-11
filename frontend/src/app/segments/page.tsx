"use client";

import { useEffect, useState } from "react";
import { getSegments, createSegment, aiSegment, deleteSegment } from "@/lib/api";
import type { Segment } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FilterTags({ filters }: { filters: any }) {
  if (!filters) return null;
  const labels: string[] = [];
  if (filters.min_spend) labels.push(`Spend ≥ ₹${Number(filters.min_spend).toLocaleString()}`);
  if (filters.max_spend) labels.push(`Spend ≤ ₹${Number(filters.max_spend).toLocaleString()}`);
  if (filters.min_orders) labels.push(`Orders ≥ ${filters.min_orders}`);
  if (filters.inactive_days) labels.push(`Inactive ${filters.inactive_days}+ days`);
  if (filters.active_days) labels.push(`Active in last ${filters.active_days} days`);
  if (filters.city) labels.push(`City: ${filters.city}`);
  if (labels.length === 0) labels.push("All customers");
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {labels.map((l) => (
        <span key={l} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full border border-indigo-100">
          {l}
        </span>
      ))}
    </div>
  );
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [nlQuery, setNlQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getSegments().then(setSegments).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAI = async () => {
    if (!nlQuery.trim()) return;
    setAiLoading(true);
    setError("");
    try {
      const res = await aiSegment(nlQuery);
      setFilters(res.filters);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await createSegment({ name, description: nlQuery || null, filters, nl_query: null });
      setShowModal(false);
      setName(""); setNlQuery(""); setFilters({});
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Segments</h1>
          <p className="text-slate-500 text-sm mt-1">Define audiences for your campaigns</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + New Segment
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : segments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No segments yet. Create one above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{s.name || "(Unnamed)"}</h3>
                  {s.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{s.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-indigo-600 font-bold text-lg">{s.customer_count}</span>
                  <button
                    onClick={async () => { await deleteSegment(s.id); load(); }}
                    className="text-slate-300 hover:text-rose-500 text-sm"
                    title="Delete segment"
                  >✕</button>
                </div>
              </div>
              <FilterTags filters={s.filters} />
              <p className="text-xs text-slate-400 mt-3">
                {s.created_at
                  ? new Date(s.created_at.replace(" ", "T")).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })
                  : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">New Segment</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Segment Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. High-value inactive customers"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Describe your audience
                  <span className="ml-2 text-xs text-indigo-500 font-normal">✨ AI-powered</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    placeholder="e.g. customers inactive for 30 days with spend over ₹5000"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    onKeyDown={(e) => e.key === "Enter" && handleAI()}
                  />
                  <button
                    onClick={handleAI}
                    disabled={aiLoading || !nlQuery.trim()}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {aiLoading ? "..." : "✨ Build"}
                  </button>
                </div>
              </div>

              {Object.keys(filters).length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <p className="text-xs font-medium text-indigo-700 mb-2">AI-generated filters</p>
                  <FilterTags filters={filters} />
                </div>
              )}

              {error && <p className="text-rose-500 text-xs">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Segment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
