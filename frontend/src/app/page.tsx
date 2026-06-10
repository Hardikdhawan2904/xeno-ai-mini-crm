"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/StatsCard";
import { getCampaigns, getOverviewStats } from "@/lib/api";
import type { Campaign, OverviewStats } from "@/lib/types";

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "💬",
  sms: "📱",
  email: "📧",
  rcs: "🔵",
};

const STATUS_BADGE: Record<string, string> = {
  running: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOverviewStats(), getCampaigns()])
      .then(([s, c]) => {
        setStats(s);
        setCampaigns(c.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your CRM activity</p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatsCard label="Total Customers" value={stats?.total_customers ?? 0} color="indigo" />
            <StatsCard label="Total Campaigns" value={stats?.total_campaigns ?? 0} color="green" />
            <StatsCard label="Messages Sent" value={stats?.total_communications ?? 0} color="amber" />
            <StatsCard
              label="Delivery Rate"
              value={`${stats?.delivery_rate ?? 0}%`}
              sub="of all sent"
              color="green"
            />
            <StatsCard
              label="Open Rate"
              value={`${stats?.open_rate ?? 0}%`}
              sub="of all sent"
              color="indigo"
            />
            <StatsCard
              label="Click Rate"
              value={`${stats?.click_rate ?? 0}%`}
              sub="of all sent"
              color="amber"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-700">Recent Campaigns</h2>
              <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline">
                View all →
              </Link>
            </div>
            {campaigns.length === 0 ? (
              <p className="px-6 py-8 text-slate-400 text-sm text-center">
                No campaigns yet.{" "}
                <Link href="/campaigns" className="text-indigo-600 hover:underline">
                  Create one →
                </Link>
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-slate-100">
                    <th className="px-6 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium">Channel</th>
                    <th className="px-4 py-3 font-medium">Segment</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                    <th className="px-4 py-3 font-medium">Opened</th>
                    <th className="px-4 py-3 font-medium">Clicked</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="font-medium text-slate-800 hover:text-indigo-600"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {CHANNEL_ICONS[c.channel] ?? "📨"} {c.channel}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.segment_name}</td>
                      <td className="px-4 py-3 font-mono">{c.stats.sent}</td>
                      <td className="px-4 py-3 font-mono">
                        {c.stats.sent
                          ? `${Math.round((c.stats.opened / c.stats.sent) * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {c.stats.sent
                          ? `${Math.round((c.stats.clicked / c.stats.sent) * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_BADGE[c.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
