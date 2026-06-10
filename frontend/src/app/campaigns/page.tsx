"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCampaigns, getSegments, createCampaign, aiMessages } from "@/lib/api";
import type { Campaign, Segment } from "@/lib/types";

const CHANNELS = ["whatsapp", "sms", "email", "rcs"];
const CHANNEL_ICONS: Record<string, string> = { whatsapp: "💬", sms: "📱", email: "📧", rcs: "🔵" };

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold text-slate-700">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Multi-step form
  const [step, setStep] = useState(1);
  const [campName, setCampName] = useState("");
  const [segmentId, setSegmentId] = useState<number | "">("");
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([getCampaigns(), getSegments()])
      .then(([c, s]) => { setCampaigns(c); setSegments(s); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selectedSegment = segments.find((s) => s.id === segmentId);

  const handleGenerateMessages = async () => {
    if (!selectedSegment) return;
    setAiLoading(true);
    setError("");
    try {
      const res = await aiMessages(
        selectedSegment.description || selectedSegment.name,
        campName || "marketing campaign"
      );
      setVariants(res.messages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!campName || !segmentId || !message) { setError("All fields required"); return; }
    setSaving(true);
    setError("");
    try {
      const c = await createCampaign({ name: campName, segment_id: segmentId, message, channel });
      setCampaigns((prev) => [c, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to launch");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1); setCampName(""); setSegmentId(""); setChannel("whatsapp");
    setMessage(""); setVariants([]); setError("");
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">Launch and track your shopper outreach</p>
        </div>
        <button
          onClick={() => { setShowModal(true); resetForm(); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + New Campaign
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No campaigns yet. Create your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{CHANNEL_ICONS[c.channel] ?? "📨"}</span>
                      <h3 className="font-semibold text-slate-800 truncate">{c.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {c.segment_name} · {new Date(c.created_at.replace(" ", "T")).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-1">{c.message}</p>
                  </div>
                  <div className="flex gap-5 ml-6 shrink-0">
                    <StatPill label="Sent" value={c.stats.sent} />
                    <StatPill label="Delivered" value={c.stats.delivered} />
                    <StatPill label="Opened" value={c.stats.opened} />
                    <StatPill label="Clicked" value={c.stats.clicked} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Campaign creation modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-800">New Campaign</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-2 mb-6">
              {["Basics", "Message", "Launch"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                      step > i + 1
                        ? "bg-emerald-500 text-white"
                        : step === i + 1
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step > i + 1 ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs ${step === i + 1 ? "text-slate-700 font-medium" : "text-slate-400"}`}>{s}</span>
                  {i < 2 && <div className="w-6 h-px bg-slate-200" />}
                </div>
              ))}
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                  <input
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                    placeholder="e.g. Summer Win-Back 2026"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Segment</label>
                  <select
                    value={segmentId}
                    onChange={(e) => setSegmentId(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Select a segment...</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.customer_count} customers)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
                  <div className="flex gap-2">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setChannel(ch)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          channel === ch
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {CHANNEL_ICONS[ch]} {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Message */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Campaign Message</label>
                  <button
                    onClick={handleGenerateMessages}
                    disabled={aiLoading}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                  >
                    {aiLoading ? "Generating..." : "✨ Generate with AI"}
                  </button>
                </div>

                {variants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Pick a variant:</p>
                    {variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setMessage(v)}
                        className={`w-full text-left text-sm p-3 rounded-lg border transition-colors ${
                          message === v
                            ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 text-slate-600 hover:border-indigo-300"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message or use AI to generate variants above..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                <p className="text-xs text-slate-400">
                  Use {"{name}"} to personalize. Target: {selectedSegment?.customer_count ?? 0} customers.
                </p>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Campaign</span><span className="font-medium">{campName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Segment</span><span className="font-medium">{selectedSegment?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Channel</span><span className="font-medium">{CHANNEL_ICONS[channel]} {channel}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Recipients</span><span className="font-bold text-indigo-600">{selectedSegment?.customer_count ?? 0}</span></div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800 border border-indigo-100">
                  <p className="font-medium mb-1">Message preview</p>
                  <p className="text-indigo-700">{message.replace("{name}", "Priya")}</p>
                </div>
              </div>
            )}

            {error && <p className="text-rose-500 text-xs mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 1 ? !campName || !segmentId : !message}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleLaunch}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Launching..." : "🚀 Launch Campaign"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
