export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  total_spend: number;
  order_count: number;
  last_order_at: string | null;
  created_at: string;
}

export interface Segment {
  id: number;
  name: string;
  description: string | null;
  filters: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  customer_count: number;
  created_at: string;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
}

export interface Campaign {
  id: number;
  name: string;
  segment_id: number;
  segment_name: string;
  segment_description?: string;
  message: string;
  channel: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  stats: CampaignStats;
}

export interface OverviewStats {
  total_customers: number;
  total_campaigns: number;
  total_communications: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}
