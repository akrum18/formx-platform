const API_BASE_URL = "http://localhost:8000";

export async function getCategories(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}