import { normalizeApiBase } from "@/lib/api-url";

const base = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export async function apiFetch<T>(
  path: string,
  token: string | undefined,
  init?: RequestInit
): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers || {}),
    "Content-Type": "application/json",
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    let msg = text || res.statusText;
    if (typeof data === "object" && data && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") msg = detail;
      else msg = JSON.stringify(detail);
    }
    throw new Error(msg);
  }
  return data as T;
}
