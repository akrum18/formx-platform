// API functions and types for Routings (admin)
// This closely follows the backend Routing and RoutingStep schemas

export type RoutingStep = {
  id: string;
  routing_id: string;
  process_id: string;
  sequence: number;
  setup_time_multiplier: number;
  runtime_multiplier: number;
  notes?: string;
  parallel_step: boolean;
  quality_check_required: boolean;
  created_at: string;
  updated_at: string;
  // Process details for UI
  process_name?: string;
  process_hourly_rate?: number;
  process_setup_time?: number;
  process_minimum_cost?: number;
  process_complexity_multiplier?: number;
};

export type Routing = {
  id: string;
  name: string;
  description?: string;
  category: string;
  category_id: string;
  total_setup_time: number;
  estimated_lead_time: number;
  active: boolean;
  material_markup?: number;
  finishing_cost?: number;
  is_primary_pricing_route?: boolean;
  complexity_score?: number;
  created_at: string;
  updated_at: string;
  steps: RoutingStep[];
};

export type RoutingCreate = Omit<Routing, 'id' | 'created_at' | 'updated_at' | 'steps'> & {
  steps: Array<Omit<RoutingStep, 'id' | 'routing_id' | 'created_at' | 'updated_at' | 'process_name' | 'process_hourly_rate' | 'process_setup_time' | 'process_minimum_cost' | 'process_complexity_multiplier'> & { process_id: string }>;
};

export type RoutingUpdate = Partial<Omit<Routing, 'id' | 'created_at' | 'updated_at' | 'steps'>> & {
  steps?: Array<Omit<RoutingStep, 'id' | 'routing_id' | 'created_at' | 'updated_at' | 'process_name' | 'process_hourly_rate' | 'process_setup_time' | 'process_minimum_cost' | 'process_complexity_multiplier'> & { process_id: string }>;
};

const BASE_URL = "http://localhost:8000";
const ROUTINGS_API = `${BASE_URL}/api/admin/routings`;

const token = localStorage.getItem("auth_token");


export async function getRoutings(): Promise<Routing[]> {
  const res = await fetch(ROUTINGS_API, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch routings');
  return res.json();
}

export async function getRoutingById(id: string): Promise<Routing> {
  const res = await fetch(`${ROUTINGS_API}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch routing');
  return res.json();
}

export async function createRouting(data: RoutingCreate): Promise<Routing> {
  const res = await fetch(ROUTINGS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create routing');
  return res.json();
}

export async function updateRouting(id: string, data: RoutingUpdate): Promise<Routing> {
  const res = await fetch(`${ROUTINGS_API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update routing');
  return res.json();
}

export async function deleteRouting(id: string): Promise<void> {
  const res = await fetch(`${ROUTINGS_API}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete routing');
}