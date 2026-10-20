import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdForm, AdList, type AdminAd } from "@/components/admin/AdsManager";

export const metadata: Metadata = { title: "Admin: Piblisite | UpMizik" };

export default async function AdminAdsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data } = await supabase
    .from("ads")
    .select("id, title, image_path, link_url, starts_at, expires_at, is_active, clicks")
    .order("created_at", { ascending: false });

  const ads: AdminAd[] = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    imageUrl: supabase.storage.from("ads").getPublicUrl(a.image_path).data.publicUrl,
    linkUrl: a.link_url,
    startsAt: a.starts_at,
    expiresAt: a.expires_at,
    isActive: a.is_active,
    clicks: a.clicks,
  }));
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">📢 Piblisite patnè yo</h1>
      <p className="mt-1 text-zinc-400">Banyè ki parèt sou paj akèy la. Yo chanje otomatikman chak 6 segonn.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-white">Nouvo piblisite</h2>
          <div className="mt-5">
            <AdForm />
          </div>
        </section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-white">
            Tout piblisite yo ({ads.length}) · {totalClicks.toLocaleString("fr-HT")} klik
          </h2>
          <div className="mt-5">
            <AdList ads={ads} />
          </div>
        </section>
      </div>
    </div>
  );
}
