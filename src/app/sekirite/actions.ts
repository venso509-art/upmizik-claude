"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export type PasswordState = { error?: string; message?: string; loggedOut?: boolean } | undefined;

const MIN_LENGTH = 8;

// Apre 3 echèk: dekonekte kont lan sou TOUT aparèy yo (si se yon vòlè, li pèdi aksè touswit)
async function lockOut(supabase: ReturnType<typeof createClient>): Promise<PasswordState> {
  await supabase.auth.signOut({ scope: "global" });
  return {
    loggedOut: true,
    error: "3 tantativ ki echwe. Pou sekirite, nou dekonekte kont lan sou tout aparèy yo, e paj sa a bloke pou 30 minit.",
  };
}

async function failure(supabase: ReturnType<typeof createClient>, what: string): Promise<PasswordState> {
  const { data: left } = await supabase.rpc("register_security_failure");
  if (Number(left) <= 0) return lockOut(supabase);
  return { error: `${what} Ou gen ${left} tantativ ki rete.` };
}

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Ou dwe konekte." };

  const oldPassword = String(formData.get("old_password") ?? "");
  const secretCode = String(formData.get("secret_code") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  // 0. Èske paj la bloke?
  const { data: status } = await supabase.rpc("security_status");
  const s = (status as { has_code: boolean; locked_until: string | null }[] | null)?.[0];
  if (!s?.has_code) return { error: "Kont ou pa gen kòd sekrè. Chanjman modpas la pa disponib." };
  if (s.locked_until) return { error: `Paj sa a bloke jiska ${new Date(s.locked_until).toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" })}.` };

  // 1. Nouvo modpas la valid? (sa pa konte kòm yon echèk)
  if (newPassword.length < MIN_LENGTH) return { error: `Nouvo modpas la dwe gen omwen ${MIN_LENGTH} karaktè.` };
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return { error: "Nouvo modpas la dwe gen lèt AK chif." };
  if (newPassword !== confirm) return { error: "De nouvo modpas yo pa menm." };
  if (newPassword === oldPassword) return { error: "Nouvo modpas la dwe diferan de ansyen an." };

  // 2. Kòd sekrè a (baz done a konte echèk yo)
  const { data: codeRes, error: codeErr } = await supabase.rpc("verify_secret_code", { p_code: secretCode });
  if (codeErr) return { error: codeErr.message };
  const code = (codeRes as { ok: boolean; attempts_left: number; locked: boolean }[] | null)?.[0];
  if (!code?.ok) {
    if (code?.locked) return lockOut(supabase);
    return { error: `Kòd sekrè a pa bon. Ou gen ${code?.attempts_left ?? 0} tantativ ki rete.` };
  }

  // 3. Ansyen modpas la: nou verifye l ak yon kliyan apa, pou sesyon aktyèl la pa chanje
  const { url, key } = supabaseEnv();
  const checker = createStatelessClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: pwErr } = await checker.auth.signInWithPassword({ email: user.email, password: oldPassword });
  if (pwErr) return failure(supabase, "Ansyen modpas la pa bon.");
  await checker.auth.signOut({ scope: "local" });

  // 4. Chanje modpas la
  const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updErr) return { error: `Modpas la pa chanje: ${updErr.message}` };

  await supabase.rpc("password_change_succeeded");
  // Dekonekte tout LÒT aparèy yo (sesyon sa a rete konekte)
  await supabase.auth.signOut({ scope: "others" });

  return { message: "Modpas ou chanje! ✅ Tout lòt aparèy yo dekonekte. Itilize nouvo modpas la pwochen fwa w konekte." };
}
