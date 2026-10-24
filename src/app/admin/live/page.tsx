import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { LiveAdminList, type AdminLive } from "@/components/admin/LiveAdminList";
import { formatHTG } from "@/lib/donations";

export const metadata: Metadata = { title: "Admin: Jesyon Live | UpMizik" };
export const dynamic = "force-dynamic";

// Tout live yo (sa k ap fèt yo an premye), revni yo, ak blokaj atis yo
export default async function AdminLivePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data } = await supabase.rpc("admin_lives", { p_limit: 200 });
  const lives = ((data ?? []) as AdminLive[]).map((l) => ({ ...l, gift_htg: Number(l.gift_htg), artist_htg: Number(l.artist_htg), platform_htg: Number(l.platform_htg), likes: Number(l.likes) }));
  const onNow = lives.filter((l) => l.is_on).length;
  const platform = lives.reduce((s, l) => s + l.platform_htg, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />
      <h1 className="text-3xl font-extrabold tracking-tight text-white">🎥 Jesyon Live</h1>
      <p className="mt-1 text-zinc-400">Live k ap fèt kounye a ak live ki pase yo. Ou ka kanpe yon live oswa bloke yon atis pandan kèk jou si l fè yon enfraksyon.</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm text-zinc-400">🔴 An live kounye a</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{onNow}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm text-zinc-400">🎬 Live anrejistre</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{lives.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-sm text-zinc-400">💰 Pa UpMizik (40%)</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{formatHTG(platform)}</p>
        </div>
      </section>

      <div className="mt-6">
        <LiveAdminList lives={lives} />
      </div>
    </div>
  );
}
