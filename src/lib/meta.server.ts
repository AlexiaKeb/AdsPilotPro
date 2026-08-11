// Server-only helpers for the Meta (Facebook) Marketing API.
// Never import this from client-reachable module scope.

export const META_API_VERSION = "v21.0";
export const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;
export const META_SCOPE = "ads_read";

export function metaAppCredentials() {
  const appId = process.env["META_APP_ID"];
  const appSecret = process.env["META_APP_SECRET"];
  if (!appId || !appSecret) {
    throw new Error("Configuration Meta manquante côté serveur.");
  }
  return { appId, appSecret };
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${META_GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json["error"]) {
    const err = json["error"] as { message?: string } | undefined;
    throw new Error(err?.message || `Erreur Meta API (${res.status})`);
  }
  return json as T;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const { appId, appSecret } = metaAppCredentials();
  const short = await graph<{ access_token: string }>("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  // Upgrade to a long-lived token (~60 days)
  const long = await graph<{ access_token: string; expires_in?: number }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: short.access_token,
  });
  const expiresIn = long.expires_in ?? 60 * 24 * 3600;
  return {
    accessToken: long.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
}

export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const data = await graph<{ data: MetaAdAccount[] }>("/me/adaccounts", {
    access_token: accessToken,
    fields: "id,account_id,name,currency",
    limit: "100",
  });
  return data.data ?? [];
}

export interface MetaMetrics {
  roas: number;
  cpa: number;
  dailyBudget: number;
  ctr: number;
  spend: number;
  purchases: number;
  periodDays: number;
}

interface InsightRow {
  spend?: string;
  ctr?: string;
  purchase_roas?: { action_type: string; value: string }[];
  actions?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
}

const PURCHASE_TYPES = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];

function pick(list: { action_type: string; value: string }[] | undefined): number {
  if (!list) return 0;
  for (const type of PURCHASE_TYPES) {
    const hit = list.find((a) => a.action_type === type);
    if (hit) return Number(hit.value) || 0;
  }
  return 0;
}

export async function fetchAccountMetrics(
  accessToken: string,
  adAccountId: string,
  periodDays = 30,
): Promise<MetaMetrics> {
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const data = await graph<{ data: InsightRow[] }>(`/${actId}/insights`, {
    access_token: accessToken,
    fields: "spend,ctr,purchase_roas,actions,cost_per_action_type",
    date_preset: periodDays <= 7 ? "last_7d" : "last_30d",
  });
  const row = data.data?.[0];
  if (!row) {
    return { roas: 0, cpa: 0, dailyBudget: 0, ctr: 0, spend: 0, purchases: 0, periodDays };
  }
  const spend = Number(row.spend) || 0;
  const purchases = pick(row.actions);
  const roas = pick(row.purchase_roas);
  const cpaReported = pick(row.cost_per_action_type);
  const cpa = cpaReported || (purchases > 0 ? spend / purchases : 0);
  return {
    roas: round2(roas),
    cpa: round2(cpa),
    dailyBudget: round2(spend / periodDays),
    ctr: round2(Number(row.ctr) || 0),
    spend: round2(spend),
    purchases,
    periodDays,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
