import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { formatHTG } from "@/lib/donations";
import { ARTIST_SHARE_PERCENT } from "@/lib/finance";

export const metadata: Metadata = { title: "Revni mwen | UpMizik" };
export const dynamic = "force-dynamic";

type Row = {
  song_id: string;
  title: string;
  owner_name: string;
  is_owner: boolean;
  my_percentage: number;
  plays: number;
  donations_count: number;
  total_htg: number;
  artists_htg: number;
  my_htg: number;
};

function Tile({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">
        {icon} {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default async function MyRevenuePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (profile?.role !== "artist" || profile.status !== "approved") redirect("/dashboard");

  const { data, error } = await supabase.rpc("my_song_revenue");
  const rows = ((data ?? []) as Row[]).map((r) => ({
    ...r,
    my_percentage: Number(r.my_percentage),
    total_htg: Number(r.total_htg),
    artists_htg: Number(r.artists_htg),
    my_htg: Number(r.my_htg),
  }));
  const owned = rows.filter((r) => r.is_owner);
  const featured = rows.filter((r) => !r.is_owner);
  const myTotal = rows.reduce((s, r) => s + r.my_htg, 0);
  const songsTotal = rows.reduce((s, r) => s + r.total_htg, 0);

  const table = (list: typeof rows, title: string, subtitle: string) => (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-zinc-500">{subtitle}</p>
      {/* Telefòn: kat; òdinatè: tablo */}
      <ul className="mt-4 space-y-3 md:hidden">
        {list.map((r) => (
          <li key={r.song_id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/chante/${r.song_id}`} className="min-w-0 truncate font-semibold text-white hover:underline">
                {r.title}
              </Link>
              <span className="shrink-0 rounded-full bg-citron-400 px-2.5 py-0.5 text-xs font-bold text-zinc-950">{r.my_percentage}%</span>
            </div>
            {!r.is_owner && <p className="text-xs text-zinc-500">🎤 Chante {r.owner_name}</p>}
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-[11px] text-zinc-500">🎧 Koute</dt>
                <dd className="font-semibold text-white">{r.plays.toLocaleString("fr-HT")}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-zinc-500">💝 Total don</dt>
                <dd className="font-semibold text-white">{formatHTG(r.total_htg)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-zinc-500">💵 Pa m</dt>
                <dd className="font-bold text-citron-300">{formatHTG(r.my_htg)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-zinc-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Chante</th>
              <th className="px-4 py-3 text-right">🎧 Koute</th>
              <th className="px-4 py-3 text-right">💝 Don</th>
              <th className="px-4 py-3 text-right">Total rapòte</th>
              <th className="px-4 py-3 text-right">Pousantaj mwen</th>
              <th className="px-4 py-3 text-right">💵 Pa m</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {list.map((r) => (
              <tr key={r.song_id} className="bg-zinc-900/30 transition hover:bg-zinc-900/70">
                <td className="px-4 py-3">
                  <Link href={`/chante/${r.song_id}`} className="font-semibold text-white hover:underline">
                    {r.title}
                  </Link>
                  {!r.is_owner && <span className="block text-xs text-zinc-500">🎤 Chante {r.owner_name}</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{r.plays.toLocaleString("fr-HT")}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{r.donations_count}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{formatHTG(r.total_htg)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-full bg-citron-400 px-2.5 py-0.5 text-xs font-bold text-zinc-950">{r.my_percentage}%</span>
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-citron-300">{formatHTG(r.my_htg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DashboardTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">💵 Revni mwen</h1>
      <p className="mt-1 text-zinc-400">Konbyen chak chante rapòte, ak konbyen ki pou ou, dapre pousantaj ou.</p>

      {error ? (
        <p className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Revni yo pa chaje: {error.message}</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
          <p className="text-4xl">🎵</p>
          <p className="mt-3 font-semibold text-white">Ou poko gen chante</p>
          <p className="mt-1 text-sm text-zinc-400">Pibliye yon chante, oswa yon lòt atis ka mete w nan featuring.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Tile icon="💵" label="Total pa m" value={formatHTG(myTotal)} hint="Apre 15% UpMizik, avan frè $0.99 pa mwa" />
            <Tile icon="💝" label="Total chante m yo rapòte" value={formatHTG(songsTotal)} />
            <Tile icon="🎤" label="Chante" value={`${owned.length} pa m · ${featured.length} featuring`} />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            &quot;Pa m&quot; = pousantaj ou sou {ARTIST_SHARE_PERCENT}% pa atis yo. Frè lojistik $0.99 la retire sou balans ou nan mwa ou touche yo (gade 💰 Revni &amp; Finans).
          </p>
          {owned.length > 0 && table(owned, "🎵 Chante ou posede", "Pousantaj ou = sa ki rete apre featuring ak kolaboratè yo.")}
          {featured.length > 0 && table(featured, "🎤 Chante kote w nan featuring", "Lòt atis mete w sou chante yo, ak pousantaj sa a.")}
        </>
      )}
    </div>
  );
}
