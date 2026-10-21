import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { PROMO_SELECT, toPromo, type PromoRow } from "@/lib/promos";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PromoForm, PromoList, type AdminPromo, type ArtistOption } from "@/components/admin/PromoManager";

export const metadata: Metadata = { title: "Admin: RPA | UpMizik" };

export default async function AdminPromosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const [{ data: rows }, { data: artistRows }] = await Promise.all([
    supabase.from("artist_promos").select(PROMO_SELECT).order("position").order("created_at", { ascending: false }).returns<PromoRow[]>(),
    supabase.from("profiles").select("id, display_name").eq("role", "artist").eq("status", "approved").is("archived_at", null).order("display_name"),
  ]);

  const promos: AdminPromo[] = (rows ?? []).map((r) => {
    const p = toPromo(supabase, r);
    return { id: p.id, title: p.title, artistName: p.artistName, kind: r.kind, videoUrl: p.videoUrl, imageUrl: p.imageUrl, youtubeUrl: p.youtubeUrl, isActive: r.is_active };
  });
  const artists: ArtistOption[] = (artistRows ?? []).map((a) => ({ id: a.id, name: a.display_name }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🚀 Ribrik Pouse Atis (RPA)</h1>
      <p className="mt-1 text-zinc-400">Videyo kout san son oswa lyen YouTube pou fè atis k ap monte yo konnen. Yo parèt nan « Atis pou dekouvri » sou paj akèy la.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-white">Nouvo RPA</h2>
          <div className="mt-5">
            <PromoForm artists={artists} />
          </div>
        </section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-white">Lòd sou paj akèy la ({promos.length})</h2>
          <div className="mt-5">
            <PromoList promos={promos} />
          </div>
        </section>
      </div>
    </div>
  );
}
