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

// Enskripsyon KOUTÈ (atis yo pase pa signupArtist anba a)
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !displayName) return { error: "Ranpli tout chan yo." };
  if (password.length < 8) return { error: "Modpas la dwe gen omwen 8 karaktè." };

  const origin = headers().get("origin") ?? "";
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Trigger handle_new_user() nan baz done a li valè sa yo pou kreye profile la
      data: { display_name: displayName, role: "listener" },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: translateError(error) };

  // Si konfimasyon imèl dezaktive, itilizatè a konekte touswit
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return { message: `Nou voye yon lyen konfimasyon bay ${email}. Klike sou li pou w aktive kont ou.` };
}

export type ArtistSignupResult = { error?: string; ok?: boolean; email?: string; needsEmailConfirmation?: boolean };

const PROOF_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Enskripsyon ATIS an yon sèl etap: kont + PIN + prèv peman frè enskripsyon an.
// Mache menm si "Confirm email" aktive (moun nan poko konekte): fonksyon SQL
// complete_artist_signup aksepte sèlman yon kont atis ki fèk kreye.
export async function signupArtist(formData: FormData): Promise<ArtistSignupResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim().slice(0, 100);
  const pin = String(formData.get("pin") ?? "").trim();
  const pinConfirm = String(formData.get("pin_confirm") ?? "").trim();
  const method = formData.get("method") === "natcash" ? "natcash" : "moncash";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim();
  const proof = formData.get("proof");

  if (!email || !displayName) return { error: "Ranpli tout chan yo." };
  if (password.length < 8) return { error: "Modpas la dwe gen omwen 8 karaktè." };
  if (phone.replace(/\D/g, "").length < 8) return { error: "Mete yon nimewo telefòn/WhatsApp valid." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "PIN nan dwe gen 4 a 6 chif." };
  if (pin !== pinConfirm) return { error: "2 PIN yo pa menm." };
  if (!(proof instanceof File) || proof.size === 0) return { error: "Ajoute foto prèv peman an." };
  const ext = proof.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PROOF_TYPES[ext]) return { error: "Prèv la dwe yon foto JPG, PNG oswa WebP." };
  if (proof.size > 5 * 1024 * 1024) return { error: "Foto a twò gwo. Maksimòm: 5 MB." };

  // 1. Kreye kont lan
  const origin = headers().get("origin") ?? "";
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Telefòn nan ale nan tablo prive artist_private (pa nan profile piblik la)
      // Zòn nan (vil/depatman/peyi) ale sou pwofil piblik la pou CV atis la
      data: { display_name: displayName, role: "artist", phone, location: location || null },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { error: translateError(error) };
  // Lè "Confirm email" aktive, Supabase pa di si imèl la deja itilize: li retounen yon kont san "identities"
  if (!data.user || data.user.identities?.length === 0) return { error: "Gen yon kont ki deja egziste ak imèl sa a." };

  // 2. Voye foto prèv la nan folder kont lan
  const proofPath = `registration/${data.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("donation-proofs")
    .upload(proofPath, proof, { contentType: PROOF_TYPES[ext], upsert: false });
  if (uploadError) {
    return { error: `Kont ou kreye, men foto prèv la pa monte (${uploadError.message}). Konekte epi voye l ankò sou dashboard ou.` };
  }

  // 3. PIN chifre + demann peman an
  const { error: rpcError } = await supabase.rpc("complete_artist_signup", {
    p_user_id: data.user.id,
    p_pin: pin,
    p_method: method,
    p_transaction_ref: transactionRef || null,
    p_proof_path: proofPath,
  });
  if (rpcError) {
    return { error: `Kont ou kreye, men demann lan pa anrejistre (${rpcError.message}). Konekte epi voye prèv la ankò sou dashboard ou.` };
  }

  // Modération manyèl: kont lan rete an "standby" jiskaske admin nan apwouve l,
  // kidonk nou dekonekte atis la touswit (lè "Confirm email" dezaktive, Supabase te konekte l).
  if (data.session) {
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
  }
  return { ok: true, email, needsEmailConfirmation: !data.session };
}

// Retounen yon mesaj si atis la pa gen dwa konekte kounye a, oswa null si l ka konekte
async function artistLoginBlock(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profile: { role: string; status: string } | null,
): Promise<string | null> {
  if (profile?.role !== "artist" || profile.status === "approved") return null;
  if (profile.status === "blocked") return "Kont atis ou bloke. Kontakte ekip UpMizik la: upmizikcontact@gmail.com.";

  const { data: last } = await supabase
    .from("artist_registrations")
    .select("status")
    .eq("artist_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.status === "pending") {
    return "⏳ Kont atis ou ap tann validasyon admin. W ap ka konekte depi ekip UpMizik la apwouve l.";
  }
  return null; // prèv rejte oswa pa janm voye: li ka konekte pou l voye yon nouvo prèv
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Ranpli imèl ak modpas ou." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Jounal sekirite: anrejistre chak tantativ (reyisi oswa echwe), ak IP ak navigatè a
  const h = headers();
  await supabase.rpc("log_login", {
    p_email: email,
    p_success: !error,
    p_ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null,
    p_user_agent: h.get("user-agent"),
  });

  if (error) return { error: translateError(error) };

  // Atis yo ateri sou dashboard yo; koutè yo sou paj akèy la
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();

  // Modération manyèl: yon atis pa ka konekte toutotan admin nan pa apwouve kont li.
  // Eksepsyon: si prèv peman li te rejte (oswa li pa t janm rive), li ka konekte pou l voye yon lòt.
  // Nenpòt kont bloke (atis OSWA koutè) pa ka konekte ditou
  if (profile?.status === "blocked") {
    await supabase.auth.signOut();
    return { error: "Kont ou bloke. Kontakte ekip UpMizik la: upmizikcontact@gmail.com." };
  }
  const blocked = await artistLoginBlock(supabase, data.user.id, profile);
  if (blocked) {
    await supabase.auth.signOut();
    return { error: blocked };
  }

  revalidatePath("/", "layout");
  redirect(profile?.role === "artist" ? "/dashboard" : "/");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
