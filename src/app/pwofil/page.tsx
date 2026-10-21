import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, type EditableProfile } from "@/components/profile/ProfileForm";

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
  const { data: banner } = await supabase.from("profiles").select("banner_url").eq("id", user.id).maybeSingle<{ banner_url: string | null }>();

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
      <ProfileForm profile={{ ...profile, banner_url: banner?.banner_url ?? null }} />
    </div>
  );
}
