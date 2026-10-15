import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Suppression définitive du compte (RGPD) :
 * 1. révoque et supprime la connexion Meta,
 * 2. supprime l'avatar du Storage,
 * 3. supprime l'utilisateur (cascade FK : profil, audits, partages, tâches, connexion Meta).
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { purgeMetaConnection } = await import("./meta.server");
    const userId = context.userId;

    await purgeMetaConnection(userId);

    const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
    if (files?.length) {
      await supabaseAdmin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
