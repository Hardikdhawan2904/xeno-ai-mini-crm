const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Customers
export const getCustomers = (search?: string) =>
  req<{ customers: import("./types").Customer[]; total: number }>(
    `/api/customers?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`
  );

export const getCustomerStats = () =>
  req<{ total: number; avg_spend: number; avg_orders: number; cities: number }>(
    "/api/customers/stats"
  );

export const bulkIngest = (data: unknown) =>
  req("/api/customers/bulk", { method: "POST", body: JSON.stringify(data) });

// Segments
export const getSegments = () =>
  req<import("./types").Segment[]>("/api/segments");

export const createSegment = (data: unknown) =>
  req<import("./types").Segment>("/api/segments", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteSegment = (id: number) =>
  req(`/api/segments/${id}`, { method: "DELETE" });

export const previewSegment = (id: number) =>
  req<{ count: number; sample: { id: number; name: string; city: string; total_spend: number }[] }>(
    `/api/segments/${id}/preview`
  );

// Campaigns
export const getCampaigns = () =>
  req<import("./types").Campaign[]>("/api/campaigns");

export const getCampaign = (id: number) =>
  req<import("./types").Campaign>(`/api/campaigns/${id}`);

export const createCampaign = (data: unknown) =>
  req<import("./types").Campaign>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getCampaignInsights = (id: number) =>
  req<{ insights: string }>(`/api/campaigns/${id}/insights`);

export const getOverviewStats = () =>
  req<import("./types").OverviewStats>("/api/campaigns/overview/stats");

// AI
export const aiSegment = (query: string) =>
  req<{ filters: Record<string, unknown>; query: string }>("/api/ai/segment", {
    method: "POST",
    body: JSON.stringify({ query }),
  });

export const aiMessages = (segment_description: string, campaign_goal: string) =>
  req<{ messages: string[] }>("/api/ai/messages", {
    method: "POST",
    body: JSON.stringify({ segment_description, campaign_goal }),
  });
