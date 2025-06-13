const API_BASE_URL = "http://localhost:8000";

export async function getProcesses(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/admin/processes`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}