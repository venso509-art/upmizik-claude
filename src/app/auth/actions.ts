"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

// Tradui erè Supabase yo an Kreyòl
function translateError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Imèl oswa modpas la pa kòrèk.";
    case "email_not_confirmed":
      return "Ou poko konfime imèl ou. Tcheke bwat imèl ou (ak dosye spam lan).";
    case "user_already_exists":
      return "Gen yon kont ki deja egziste ak imèl sa a.";
    case "weak_password":
      return "Modpas la twò fèb. Itilize omwen 8 karaktè.";
    case "over_email_send_rate_limit":
      return "Nou voye twòp imèl konfimasyon nan dènye èdtan an. Eseye ankò pita.";
    case "over_request_rate_limit":
      return "Twòp tantativ soti nan koneksyon ou. Tann kèk minit epi eseye ankò.";
    default:
      return `Gen yon erè ki rive: ${error.message}`;
  }
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = formData.get("role") === "artist" ? "artist" : "listener";
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const pinConfirm = String(formData.get("pin_confirm") ?? "").trim();

  if (!email || !displayName) return { error: "Ranpli tout chan yo." };
  if (password.length < 8) return { error: "Modpas la dwe gen omwen 8 karaktè." };
  if (role === "artist") {
    if (phone.replace(/\D/g, "").length < 8) return { error: "Mete yon nimewo telefòn/WhatsApp valid." };
    if (!/^\d{4,6}$/.test(pin)) return { error: "PIN nan dwe gen 4 a 6 chif." };
    if (pin !== pinConfirm) return { error: "2 PIN yo pa menm." };
  }

  const origin = headers().get("origin") ?? "";
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Trigger handle_new_user() nan baz done a li valè sa yo pou kreye profile la
      // (telefòn nan ale nan tablo prive artist_private, pa nan profile piblik la)
      data: { display_name: displayName, role, ...(role === "artist" ? { phone } : {}) },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: translateError(error) };

  // Si konfimasyon imèl dezaktive, itilizatè a konekte touswit
  if (data.session) {
    if (role === "artist") {
      // PIN nan chifre nan baz done a; li pa janm sere nan metadata kont lan
      await supabase.rpc("set_withdrawal_pin", { p_new_pin: pin, p_current_pin: null });
    }
    revalidatePath("/", "layout");
    redirect(role === "artist" ? "/dashboard?byenvini=1" : "/");
  }

  return {
    message:
      `Nou voye yon lyen konfimasyon bay ${email}. Klike sou li pou w aktive kont ou.` +
      (role === "artist" ? " Apre sa, kreye PIN retrè ou sou paj 💰 Revni & Finans lan." : ""),
  };
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Ranpli imèl ak modpas ou." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: translateError(error) };

  // Atis yo ateri sou dashboard yo; koutè yo sou paj akèy la
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();

  revalidatePath("/", "layout");
  redirect(profile?.role === "artist" ? "/dashboard" : "/");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
