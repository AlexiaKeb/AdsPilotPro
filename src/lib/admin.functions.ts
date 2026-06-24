import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Vérification du rôle impossible");
  if (!data) throw new Error("Forbidden");
}

const planSchema = z.enum(["free", "starter", "pro"]);

export const adminUpdatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; plan: "free" | "starter" | "pro" }) =>
    z.object({ userId: z.string().uuid(), plan: planSchema }).parse(data)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: data.plan })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(data)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte ici.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profs, error: pErr }, { data: audits, error: aErr }, authRes] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, email, full_name, plan, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("audits").select("user_id, created_at"),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (aErr) throw new Error(aErr.message);

    const auditCounts: Record<string, number> = {};
    (audits ?? []).forEach((a) => {
      auditCounts[a.user_id] = (auditCounts[a.user_id] ?? 0) + 1;
    });

    const lastSignIn: Record<string, string | null> = {};
    authRes.data?.users.forEach((u) => {
      lastSignIn[u.id] = u.last_sign_in_at ?? null;
    });

    return (profs ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      plan: (p.plan ?? "free") as "free" | "starter" | "pro",
      created_at: p.created_at,
      audits_count: auditCounts[p.id] ?? 0,
      last_sign_in_at: lastSignIn[p.id] ?? null,
    }));
  });

export const adminListAudits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: audits, error: aErr }, { data: profs, error: pErr }] = await Promise.all([
      supabaseAdmin
        .from("audits")
        .select("id, user_id, sector, results, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("profiles").select("id, email, full_name"),
    ]);
    if (aErr) throw new Error(aErr.message);
    if (pErr) throw new Error(pErr.message);
    const byId = new Map<string, { email: string; full_name: string | null }>();
    (profs ?? []).forEach((p) => byId.set(p.id, { email: p.email, full_name: p.full_name }));
    return (audits ?? []).map((a) => {
      const results = (a.results ?? {}) as { score?: number; score_global?: number };
      return {
        id: a.id,
        user_id: a.user_id,
        user_email: byId.get(a.user_id)?.email ?? "—",
        user_name: byId.get(a.user_id)?.full_name ?? null,
        sector: a.sector,
        score: results.score ?? results.score_global ?? null,
        created_at: a.created_at,
      };
    });
  });

export const adminCheckRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });
