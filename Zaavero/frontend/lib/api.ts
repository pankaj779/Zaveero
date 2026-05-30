import { parseApiError } from "./api-error";
import { getPublicApiUrl } from "./server-api";

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  long_description: string | null;
  icon: string;
  category: string;
  status: string;
  launch_url: string;
  documentation_url: string | null;
  is_core: boolean;
  min_plan_tier: string;
  addon_price_cents: number;
  enabled: boolean;
  workspace_status: string | null;
};

export type DashboardOverview = {
  workspace: { id: string; name: string; slug: string };
  plan_tier: string;
  total_products_enabled: number;
  total_users: number;
  active_users_7d: number;
  usage_metrics: Record<string, number>;
  recent_activity: Array<{
    id: string;
    action: string;
    resource_type: string | null;
    created_at: string;
    user: { name: string | null; email: string } | null;
  }>;
  announcements: Array<{ id: string; title: string; body: string; type: string }>;
  enabled_products: Product[];
};

export type MarketplaceCatalog = {
  plan_tier: string;
  products: Array<
    Product & {
      plan_eligible: boolean;
      can_enable: boolean;
      long_description: string | null;
    }
  >;
  categories: string[];
};

export type BillingSummary = {
  plan_tier: string;
  billing_email: string | null;
  status: string;
  subscription_status: string | null;
  stripe_configured: boolean;
  available_plans: Array<{
    slug: string;
    name: string;
    description: string | null;
    price_monthly_cents: number;
    max_users: number;
    max_products: number;
    features: string[];
  }>;
  addons: Array<{ product_slug: string; product_name: string; quantity: number }>;
};

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getPublicApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(parseApiError(err.detail, "Request failed"));
  }
  return res.json();
}

export const platformApi = {
  dashboard: (token: string) => apiFetch<DashboardOverview>("/dashboard/overview", token),
  products: (token: string) => apiFetch<Product[]>("/products", token),
  enabledProducts: (token: string) => apiFetch<Product[]>("/products/enabled", token),
  marketplace: (token: string) => apiFetch<MarketplaceCatalog>("/marketplace", token),
  enableProduct: (token: string, slug: string) =>
    apiFetch<Product>(`/products/${slug}/enable`, token, { method: "POST", body: "{}" }),
  disableProduct: (token: string, slug: string) =>
    apiFetch<{ ok: boolean }>(`/products/${slug}/disable`, token, { method: "POST" }),
  launchProduct: (token: string, slug: string) =>
    apiFetch<{ launch_url: string; sso_token: string }>(`/products/${slug}/launch`, token, {
      method: "POST",
    }),
  billing: (token: string) => apiFetch<BillingSummary>("/billing/summary", token),
  members: (token: string) =>
    apiFetch<Array<{ id: string; email: string; name: string | null; role: string }>>(
      "/workspace/members",
      token
    ),
  me: (token: string) => apiFetch<{ user: { id: string; email: string; name: string | null; role: string } }>(
    "/auth/me",
    token
  ),
};
