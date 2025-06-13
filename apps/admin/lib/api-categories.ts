// lib/api-categories.ts
// API utility for dynamic CRUD of categories (all types, esp. routing)

export interface Category {
  id: string;
  name: string;
  type: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
}
const API_BASE_URL = "http://localhost:8000";
const API_BASE = "api/admin/categories";

export async function getCategories(type?: string): Promise<Category[]> {
  const url = type ? `${API_BASE_URL}/${API_BASE}?category_type=${encodeURIComponent(type)}` : API_BASE;
  const token = localStorage.getItem("auth_token");
  const res = await fetch(url, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    credentials: "include"
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
   const token = localStorage.getItem("auth_token");
  const res = await fetch(API_BASE_URL+'/'+API_BASE, {
    method: "POST",
   
    headers: {
      "Content-Type": "application/json",
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE_URL}/${API_BASE}/${id}`, {
    method: "PUT",
    
    headers: {
      "Content-Type": "application/json",
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
   
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE_URL}/${API_BASE}/${id}`, {
    method: "DELETE",
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
}