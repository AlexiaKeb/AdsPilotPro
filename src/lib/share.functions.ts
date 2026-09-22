import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ShareLink = {
  id: string;
  token: string;
  expiresAt: string | null;
  revoked: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
};

export type SharedReport = {
  auditName: string | null;
  sector: string;
  tags: string[];
  createdAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any;
  authorName: string | null;
};

function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 40);
}

/** Create (or refresh) a shareable read-only link for one of the user's audits. */
export const createAuditShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { auditId: string; expiresInDays: number | null }) => {
    if (!input?.auditId || typeof input.auditId !== "string") {
      throw new Error("Audit invalide");
    }
    const d = input.expiresInDays;
    if (d !== null && (typeof d !== "number" || d < 1 || d > 365)) {
      throw new Error("Durée de validité invalide");
    }
    return { auditId: input.auditId, expiresInDays: d };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: audit, error: auditErr } = await supabase
      .from("audits")
      .select("id")
      .eq("id", data.auditId)
      .eq("user_id", userId)
      .maybeSingle();
    if (auditErr) throw new Error(auditErr.message);
    if (!audit) throw new Error("Audit introuvable");

    const expiresAt =
      data.expiresInDays === null
        ? null
        : new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString();

    const { data: row, error } = await supabase
      .from("audit_shares")
      .insert({
        audit_id: data.auditId,
        user_id: userId,
        token: makeToken(),
        expires_at: expiresAt,
      })
      .select("id, token, expires_at, revoked, view_count, last_viewed_at, created_at")
      .single();
    if (error) throw new Error(error.message);

    return {
      id: row.id,
      token: row.token,
      expiresAt: row.expires_at,
      revoked: row.revoked,
      viewCount: row.view_count,
      lastViewedAt: row.last_viewed_at,
      createdAt: row.created_at,
    } satisfies ShareLink;
  });

/** List the share links attached to one of the user's audits. */
export const listAuditShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { auditId: string }) => {
    if (!input?.auditId) throw new Error("Audit invalide");
    return { auditId: input.auditId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("audit_shares")
      .select("id, token, expires_at, revoked, view_count, last_viewed_at, created_at")
      .eq("audit_id", data.auditId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      token: r.token,
      expiresAt: r.expires_at,
      revoked: r.revoked,
      viewCount: r.view_count,
      lastViewedAt: r.last_viewed_at,
      createdAt: r.created_at,
    })) satisfies ShareLink[];
  });

/** Revoke a share link immediately. */
export const revokeAuditShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { shareId: string }) => {
    if (!input?.shareId) throw new Error("Lien invalide");
    return { shareId: input.shareId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("audit_shares")
      .update({ revoked: true })
      .eq("id", data.shareId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Public read-only fetch of a shared report.
 * The secret token is the credential: validity, expiration and revocation are
 * all verified server-side before any audit data is returned.
 */
export const getSharedReport = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => {
    const token = typeof input?.token === "string" ? input.token.trim() : "";
    if (!token || token.length < 16 || token.length > 64 || !/^[a-z0-9]+$/i.test(token)) {
      throw new Error("Lien invalide");
    }
    return { token };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: share } = await supabaseAdmin
      .from("audit_shares")
      .select("id, audit_id, user_id, expires_at, revoked, view_count")
      .eq("token", data.token)
      .maybeSingle();

    if (!share) return { status: "not_found" as const, report: null };
    if (share.revoked) return { status: "revoked" as const, report: null };
    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
      return { status: "expired" as const, report: null };
    }

    const { data: audit } = await supabaseAdmin
      .from("audits")
      .select("name, sector, tags, created_at, inputs, results")
      .eq("id", share.audit_id)
      .maybeSingle();
    if (!audit) return { status: "not_found" as const, report: null };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, first_name, last_name")
      .eq("id", share.user_id)
      .maybeSingle();

    await supabaseAdmin
      .from("audit_shares")
      .update({
        view_count: (share.view_count ?? 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", share.id);

    const authorName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      null;

    return {
      status: "ok" as const,
      report: {
        auditName: audit.name ?? null,
        sector: audit.sector,
        tags: (audit.tags as string[] | null) ?? [],
        createdAt: audit.created_at,
        inputs: audit.inputs,
        results: audit.results,
        authorName,
      } satisfies SharedReport,
    };
  });
