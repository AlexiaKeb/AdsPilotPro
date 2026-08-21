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

/** 0 = depuis toujours (maximum) */
export type MetaPeriod = 0 | 7 | 30 | 90;

export interface MetaMetrics {
  roas: number;
  cpa: number;
  dailyBudget: number;
  ctr: number;
  spend: number;
  purchases: number;
  periodDays: number;
  impressions: number;
  clicks: number;
  revenue: number;
  avgCart: number;
  addToCart: number;
  addToCartRate: number;
  abandonRate: number;
  hookRate: number;
  holdRate: number;
  frequency: number;
  cpm: number;
  allTime: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  effectiveDays: number;
}

interface InsightRow {
  date_start?: string;
  date_stop?: string;
  spend?: string;
  ctr?: string;
  cpm?: string;
  impressions?: string;
  clicks?: string;
  frequency?: string;
  purchase_roas?: { action_type: string; value: string }[];
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  video_play_actions?: { action_type: string; value: string }[];
  video_p75_watched_actions?: { action_type: string; value: string }[];
}

const PURCHASE_TYPES = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];
const ATC_TYPES = ["omni_add_to_cart", "add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"];
const LPV_TYPES = ["landing_page_view", "omni_landing_page_view"];

function pick(list: { action_type: string; value: string }[] | undefined, types = PURCHASE_TYPES): number {
  if (!list) return 0;
  for (const type of types) {
    const hit = list.find((a) => a.action_type === type);
    if (hit) return Number(hit.value) || 0;
  }
  return 0;
}

function first(list: { action_type: string; value: string }[] | undefined): number {
  if (!list || list.length === 0) return 0;
  return Number(list[0]?.value) || 0;
}

export async function fetchAccountMetrics(
  accessToken: string,
  adAccountId: string,
  periodDays: MetaPeriod = 30,
): Promise<MetaMetrics> {
  const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const preset =
    periodDays === 0 ? "maximum" : periodDays === 7 ? "last_7d" : periodDays === 90 ? "last_90d" : "last_30d";
  const data = await graph<{ data: InsightRow[] }>(`/${actId}/insights`, {
    access_token: accessToken,
    fields:
      "spend,ctr,cpm,impressions,clicks,frequency,purchase_roas,actions,action_values,cost_per_action_type,video_play_actions,video_p75_watched_actions",

    date_preset: preset,
    time_increment: "all_days",
  });
  const row = data.data?.[0];
  const empty: MetaMetrics = {
    roas: 0, cpa: 0, dailyBudget: 0, ctr: 0, spend: 0, purchases: 0, periodDays,
    impressions: 0, clicks: 0, revenue: 0, avgCart: 0, addToCart: 0,
    addToCartRate: 0, abandonRate: 0, hookRate: 0, holdRate: 0, frequency: 0, cpm: 0,
    allTime: periodDays === 0, periodStart: null, periodEnd: null, effectiveDays: periodDays || 0,
  };
  if (!row) return empty;

  const periodStart = row.date_start ?? null;
  const periodEnd = row.date_stop ?? null;
  const spanDays =
    periodStart && periodEnd
      ? Math.max(1, Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86_400_000) + 1)
      : periodDays || 1;
  const effectiveDays = periodDays === 0 ? spanDays : periodDays;

  const spend = Number(row.spend) || 0;
  const impressions = Number(row.impressions) || 0;
  const clicks = Number(row.clicks) || 0;
  const purchases = pick(row.actions);
  const addToCart = pick(row.actions, ATC_TYPES);
  const landingViews = pick(row.actions, LPV_TYPES) || clicks;
  const revenue = pick(row.action_values);
  const roas = pick(row.purchase_roas) || (spend > 0 ? revenue / spend : 0);
  const cpaReported = pick(row.cost_per_action_type);
  const cpa = cpaReported || (purchases > 0 ? spend / purchases : 0);
  const views3s = first(row.video_play_actions);
  const p75 = first(row.video_p75_watched_actions);

  return {
    roas: round2(roas),
    cpa: round2(cpa),
    dailyBudget: round2(spend / effectiveDays),
    ctr: round2(Number(row.ctr) || 0),
    spend: round2(spend),
    purchases,
    periodDays,
    impressions,
    clicks,
    revenue: round2(revenue),
    avgCart: round2(purchases > 0 ? revenue / purchases : 0),
    addToCart,
    addToCartRate: round2(landingViews > 0 ? (addToCart / landingViews) * 100 : 0),
    abandonRate: round2(addToCart > 0 ? (1 - purchases / addToCart) * 100 : 0),
    hookRate: round2(impressions > 0 ? (views3s / impressions) * 100 : 0),
    holdRate: round2(impressions > 0 ? (p75 / impressions) * 100 : 0),
    frequency: round2(Number(row.frequency) || 0),
    cpm: round2(Number(row.cpm) || 0),
    allTime: periodDays === 0,
    periodStart,
    periodEnd,
    effectiveDays,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
