"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/StatsCard";
import { getCustomers, getCustomerStats } from "@/lib/api";
import type { Customer } from "@/lib/types";

function formatDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysSince(d: string | null) {
  if (!d) return null;
  const diff = Date.now() - new Date(d.replace(" ", "T")).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; avg_spend: number; avg_orders: number; cities: number } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (q?: string) => {
    setLoading(true);
    Promise.all([getCustomers(q), getCustomerStats()])
      .then(([data, s]) => {
        setCustomers(data.customers);
        setTotal(data.total);
        setStats(s);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <p className="text-slate-500 text-sm mt-1">Your shopper database</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatsCard label="Total Customers" value={stats?.total ?? 0} color="indigo" />
        <StatsCard label="Avg Spend" value={`₹${Math.round(stats?.avg_spend ?? 0).toLocaleString()}`} color="green" />
        <StatsCard label="Avg Orders" value={(stats?.avg_orders ?? 0).toFixed(1)} color="amber" />
        <StatsCard label="Cities" value={stats?.cities ?? 0} color="rose" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-700">All Customers</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <p className="p-6 text-slate-400 text-sm">Loading...</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-left border-b border-slate-100">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Total Spend</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Last Order</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const days = daysSince(c.last_order_at);
                  const inactive = days !== null && days > 30;
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-800">{c.name}</div>
                        <div className="text-slate-400 text-xs">{c.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.city ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        ₹{c.total_spend.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{c.order_count}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(c.last_order_at)}</td>
                      <td className="px-4 py-3">
                        {days === null ? (
                          <span className="text-slate-400 text-xs">No orders</span>
                        ) : (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              inactive
                                ? "bg-rose-50 text-rose-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {inactive ? `${days}d inactive` : `${days}d ago`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-6 py-3 text-xs text-slate-400 border-t border-slate-100">
              Showing {customers.length} of {total} customers
            </div>
          </>
        )}
      </div>
    </div>
  );
}
