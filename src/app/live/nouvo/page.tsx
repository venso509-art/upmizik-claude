import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { StartLiveForm } from "@/components/live/StartLiveForm";
import { isPro } from "@/lib/pro";

export const metadata: Metadata = { title: "Kòmanse yon live | UpMizik" };

// Atis Pro yo kòmanse yon live isit la
export default async function StartLivePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: me } = await supabase.from("profiles").select("role, status, pro_until, live_banned_until, live_ban_reason").eq("id", user.id).maybeSingle();
  if (me?.role !== "artist" || me.status !== "approved") redirect("/vin-atis");

  if (!isPro(me.pro_until)) {
    return (
      <AuthCard title="🔴 Live yo se pou atis Pro" subtitle="Vin Pro pou w ka fè live, resevwa kado epi monte sou sèn ak lòt atis.">
        <Link href="/pwofil" className="btn-primary block rounded-xl px-4 py-3 text-center">
          ⭐ Vin atis Pro
        </Link>
      </AuthCard>
    );
  }
  if (me.live_banned_until && new Date(me.live_banned_until).getTime() > Date.now()) {
    return (
      <AuthCard title="⛔ Ou bloke pou live yo" subtitle={`Jiska ${new Date(me.live_banned_until).toLocaleString("fr-HT", { dateStyle: "long", timeStyle: "short" })}`}>
        <p className="text-sm text-zinc-300">Rezon: {me.live_ban_reason ?? "—"}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="🔴 Kòmanse yon live" subtitle="Tcheke kamera w, mete yon tit, epi ale!">
      <StartLiveForm />
    </AuthCard>
  );
}
