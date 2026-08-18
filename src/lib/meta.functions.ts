import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MetaStatus {
  connected: boolean;
  adAccountId: string | null;
  adAccountName: string | null;
  lastSyncedAt: string | null;
  expired: boolean;
}

export const getMetaAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { redirectUri: string; state: string }) => input)
  .handler(async ({ data }) => {
    const { META_API_VERSION, META_SCOPE, metaAppCredentials } = await import("./meta.server");
    const { appId } = metaAppCredentials();
    const url = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", data.redirectUri);
    url.searchParams.set("state", data.state);
    url.searchParams.set("scope", META_SCOPE);
    url.searchParams.set("response_type", "code");
    return { url: url.toString() };
  });

export const connectMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; redirectUri: string }) => input)
  .handler(async ({ data, context }) => {
    const { exchangeCodeForToken, fetchAdAccounts } = await import("./meta.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { accessToken, expiresAt } = await exchangeCodeForToken(data.code, data.redirectUri);
    const accounts = await fetchAdAccounts(accessToken);
    const first = accounts[0] ?? null;

    const { error } = await supabaseAdmin.from("meta_connections").upsert(
      {
        user_id: context.userId,
        access_token: accessToken,
        token_expires_at: expiresAt,
        ad_account_id: first?.id ?? null,
        ad_account_name: first?.name ?? null,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    return {
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency })),
      selected: first ? { id: first.id, name: first.name } : null,
    };
  });

export const getMetaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MetaStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("meta_connections")
      .select("ad_account_id, ad_account_name, last_synced_at, token_expires_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) {
      return { connected: false, adAccountId: null, adAccountName: null, lastSyncedAt: null, expired: false };
    }
    const expired = !!data.token_expires_at && new Date(data.token_expires_at).getTime() < Date.now();
    return {
      connected: true,
      adAccountId: data.ad_account_id,
      adAccountName: data.ad_account_name,
      lastSyncedAt: data.last_synced_at,
      expired,
    };
  });

export const listMetaAdAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { fetchAdAccounts } = await import("./meta.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("meta_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) throw new Error("Compte Meta non connecté.");
    const accounts = await fetchAdAccounts(data.access_token);
    return accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }));
  });

export const selectMetaAdAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { adAccountId: string; adAccountName: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("meta_connections")
      .update({ ad_account_id: data.adAccountId, ad_account_name: data.adAccountName })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const importMetaMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { periodDays?: number } | undefined) => ({
    periodDays: input?.periodDays === 7 || input?.periodDays === 90 ? input.periodDays : (30 as const),
  }))
  .handler(async ({ data, context }) => {
    const { fetchAccountMetrics } = await import("./meta.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("meta_connections")
      .select("access_token, ad_account_id, ad_account_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!conn) throw new Error("Compte Meta non connecté.");
    if (!conn.ad_account_id) throw new Error("Aucun compte publicitaire sélectionné.");

    const metrics = await fetchAccountMetrics(conn.access_token, conn.ad_account_id, data.periodDays);
    await supabaseAdmin
      .from("meta_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", context.userId);

    return { metrics, adAccountName: conn.ad_account_name };
  });


export const disconnectMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("meta_connections").delete().eq("user_id", context.userId);
    return { ok: true };
  });
