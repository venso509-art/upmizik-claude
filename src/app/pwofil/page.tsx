import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type EditableProfile } from "@/components/profile/ProfileForm";
import { ProUpgrade } from "@/components/pro/ProUpgrade";
import { FeaturedSongPicker } from "@/components/pro/FeaturedSongPicker";
import { isPro } from "@/lib/pro";
import { InstallAppButton } from "@/components/InstallAppPrompt";

export const metadata: Metadata = { title: "Modifye pwofil | UpMizik" };

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url, location, bio, influences, vision, youtube_url, instagram_url")
    .eq("id", user.id)
    .single<Omit<EditableProfile, "banner_url">>();
  if (!profile) redirect("/");
  // Apa, pou paj la mache menm si migration banyè a poko kouri
  const { data: banner } = await supabase
    .from("profiles")
    .select("banner_url, tiktok_url, whatsapp_url")
    .eq("id", user.id)
    .maybeSingle<{ banner_url: string | null; tiktok_url: string | null; whatsapp_url: string | null }>();

  // Pwofil Pro (atis apwouve sèlman). Apa tou, pou paj la mache si migration Pro a poko kouri.
  const isArtist = profile.role === "artist";
  const { data: proRow } = isArtist
    ? await supabase
        .from("profiles")
        .select("status, pro_until, featured_song_id")
        .eq("id", user.id)
        .maybeSingle<{ status: string; pro_until: string | null; featured_song_id: string | null }>()
    : { data: null };
  const showPro = !!proRow && proRow.status === "approved";
  const pro = showPro && isPro(proRow.pro_until);
  // Yon demann Pro k ap tann validasyon admin?
  const { count: pendingPro } = showPro
    ? await supabase.from("pro_requests").select("id", { count: "exact", head: true }).eq("artist_id", user.id).eq("status", "pending")
    : { count: 0 };
  const { data: mySongs } = pro
    ? await supabase.from("songs").select("id, title").eq("artist_id", user.id).is("archived_at", null).order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Modifye pwofil ou</h1>
          <p className="mt-1 text-zinc-400">Fè moun yo konnen kiyès ou ye.</p>
        </div>
        {profile.role === "artist" && (
          <Link href={`/atis/${profile.id}`} className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
            Wè paj piblik mwen →
          </Link>
        )}
      </div>
      {showPro && (
        <div className="mb-8 space-y-3">
          <ProUpgrade proUntil={proRow.pro_until} pending={(pendingPro ?? 0) > 0} />
          {pro && <FeaturedSongPicker songs={mySongs ?? []} current={proRow.featured_song_id} />}
        </div>
      )}
      {/* Koutè: vin atis */}
      {!isArtist && (
        <Link
          href="/vin-atis"
          className="mb-4 flex items-center gap-4 rounded-2xl border border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-600/15 to-violet-700/10 p-4 transition hover:border-fuchsia-400"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-700 text-2xl" aria-hidden>
            🎤
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-white">Ou se atis? Vin atis sou UpMizik</span>
            <span className="block text-sm text-zinc-300">Pibliye mizik ou, resevwa don fanatik yo. Menm kont lan, menm modpas la.</span>
          </span>
          <span className="shrink-0 rounded-full bg-citron-400 px-3 py-1.5 text-sm font-bold text-zinc-950">Kòmanse →</span>
        </Link>
      )}
      {/* Enstale app la (si l poko enstale sou aparèy sa a) */}
      <div className="mb-8">
        <InstallAppButton />
      </div>
      <ProfileForm
        profile={{ ...profile, banner_url: banner?.banner_url ?? null, tiktok_url: banner?.tiktok_url ?? null, whatsapp_url: banner?.whatsapp_url ?? null }}
      />
    </div>
  );
}
