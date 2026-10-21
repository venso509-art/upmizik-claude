import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { formatHTG } from "@/lib/donations";
import { PAYOUT_BADGE, formatDate, type PayoutStatus } from "@/lib/finance";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ArchiveButton } from "@/components/admin/ArchiveButton";
import type { ArchiveEntity } from "./actions";

export const metadata: Metadata = { title: "Admin: Achiv | UpMizik" };

const TABS: { key: string; entity: ArchiveEntity; label: string }[] = [
  { key: "mizik", entity: "songs", label: "🎵 Mizik" },
  { key: "atis", entity: "profiles", label: "🎤 Atis" },
  { key: "don", entity: "donations", label: "💝 Don" },
  { key: "retre", entity: "payouts", label: "💸 Retrè" },
];

type Item = { id: string; label: string; sub: string; href?: string; archivedAt: string | null };

const DONATION_STATUS: Record<string, string> = { verified: "✅ Apwouve", rejected: "❌ Rejte" };

async function loadItems(entity: ArchiveEntity): Promise<Item[]> {
  const supabase = createClient();
  switch (entity) {
    case "songs": {
      const { data } = await supabase
        .from("songs")
        .select("id, title, play_count, created_at, archived_at, artist:profiles!songs_artist_id_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(300)
        .returns<{ id: string; title: string; play_count: number; created_at: string; archived_at: string | null; artist: { display_name: string } | null }[]>();
      return (data ?? []).map((s) => ({
        id: s.id,
        label: s.title,
        sub: `${s.artist?.display_name ?? "Atis"} · 🎧 ${s.play_count} · ${formatDate(s.created_at)}`,
        href: `/chante/${s.id}`,
        archivedAt: s.archived_at,
      }));
    }
    case "profiles": {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, status, created_at, archived_at")
        .eq("role", "artist")
        .order("created_at", { ascending: false })
        .limit(300);
      return (data ?? []).map((a) => ({
        id: a.id,
        label: a.display_name,
        sub: `Estati: ${a.status} · enskri ${formatDate(a.created_at)}`,
        href: `/atis/${a.id}`,
        archivedAt: a.archived_at,
      }));
    }
    case "donations": {
      // Sèlman don ki deja trete (apwouve oswa rejte) ka achive
      const { data } = await supabase
        .from("donations")
        .select("id, amount_htg, donor_name, status, created_at, archived_at, artist:profiles!donations_artist_id_fkey(display_name)")
        .neq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(300)
        .returns<{ id: string; amount_htg: number; donor_name: string | null; status: string; created_at: string; archived_at: string | null; artist: { display_name: string } | null }[]>();
      return (data ?? []).map((d) => ({
        id: d.id,
        label: `${formatHTG(Number(d.amount_htg))} → ${d.artist?.display_name ?? "Atis"}`,
        sub: `${DONATION_STATUS[d.status] ?? d.status} · ${d.donor_name ?? "Anonim"} · ${formatDate(d.created_at)}`,
        archivedAt: d.archived_at,
      }));
    }
    case "payouts": {
      // Sèlman retrè ki deja trete (peye oswa rejte) ka achive
      const { data } = await supabase
        .from("payouts")
        .select("id, amount_htg, status, phone, created_at, archived_at, artist:profiles!payouts_artist_id_fkey(display_name)")
        .neq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(300)
        .returns<{ id: string; amount_htg: number; status: PayoutStatus; phone: string; created_at: string; archived_at: string | null; artist: { display_name: string } | null }[]>();
      return (data ?? []).map((p) => ({
        id: p.id,
        label: `${formatHTG(Number(p.amount_htg))} → ${p.artist?.display_name ?? "Atis"}`,
        sub: `${PAYOUT_BADGE[p.status].label} · ${p.phone} · ${formatDate(p.created_at)}`,
        archivedAt: p.archived_at,
      }));
    }
  }
}

function ItemList({ items, entity, archived, empty }: { items: Item[]; entity: ArchiveEntity; archived: boolean; empty: string }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-zinc-500">{empty}</p>;
  return (
    <ul className="divide-y divide-zinc-800/70">
      {items.map((it) => (
        <li key={it.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            {it.href ? (
              <Link href={it.href} className="block truncate font-semibold text-white hover:underline">
                {it.label}
              </Link>
            ) : (
              <p className="truncate font-semibold text-white">{it.label}</p>
            )}
            <p className="truncate text-xs text-zinc-500">
              {it.sub}
              {it.archivedAt && ` · achive ${formatDate(it.archivedAt)}`}
            </p>
          </div>
          <ArchiveButton entity={entity} id={it.id} archived={archived} label={it.label} />
        </li>
      ))}
    </ul>
  );
}

export default async function AdminArchivePage({ searchParams }: { searchParams: { tip?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const tab = TABS.find((t) => t.key === searchParams.tip) ?? TABS[0];
  const items = await loadItems(tab.entity);
  const active = items.filter((i) => !i.archivedAt);
  const archived = items.filter((i) => i.archivedAt);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🗄️ Achiv</h1>
      <p className="mt-1 text-zinc-400">
        Achive yon eleman pou l pa ankonbre lis prensipal yo. Li pa efase: ou ka retabli l nenpòt ki lè.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/achiv?tip=${t.key}`}
            className={`rounded-full px-4 py-2 text-sm transition ${
              tab.key === t.key ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-sm text-zinc-500">
        {tab.entity === "songs" && "Yon mizik achive disparèt sou paj akèy la, Top 3, Top 10 ak paj atis la. Atis la toujou wè l nan dashboard li."}
        {tab.entity === "profiles" && "Yon atis achive: paj li ak tout mizik li yo disparèt pou piblik la. Li toujou ka konekte."}
        {tab.entity === "donations" && "Sèlman don ki deja apwouve oswa rejte ka achive. Yo disparèt nan lis 💝 Don an."}
        {tab.entity === "payouts" && "Sèlman retrè ki deja peye oswa rejte ka achive. Yo disparèt nan lis 💸 Retrè a."}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-white">Aktif ({active.length})</h2>
          <div className="mt-3">
            <ItemList items={active} entity={tab.entity} archived={false} empty="Pa gen anyen pou achive." />
          </div>
        </section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-bold text-white">🗄️ Achive ({archived.length})</h2>
          <div className="mt-3">
            <ItemList items={archived} entity={tab.entity} archived empty="Achiv la vid." />
          </div>
        </section>
      </div>
    </div>
  );
}
