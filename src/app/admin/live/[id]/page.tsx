import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import type { AdminLive } from "@/components/admin/LiveAdminList";
import type { Gifter } from "@/components/live/LiveThanks";
import { formatHTG } from "@/lib/donations";
import { formatCount, liveDuration } from "@/lib/live";

export const metadata: Metadata = { title: "Admin: Detay live | UpMizik" };
export const dynamic = "force-dynamic";

type Breakdown = { gift_id: string; emoji: string; name: string; quantity: number; credits: number; senders: number };
type View = { viewer_key: string; created_at: string; profiles: { id: string; display_name: string; avatar_url: string | null } | null };
type Guest = { id: string; guest_name: string; status: string; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Port-au-Prince" });
const hour = (iso: string) => new Date(iso).toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });
const GUEST_LABEL: Record<string, string> = { requested: "ap tann", invited: "envite", accepted: "te monte", rejected: "refize", left: "te desann", removed: "retire" };

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs text-zinc-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-white tabular-nums">{value}</p>
    </div>
  );
}

// Tout detay yon live pou admin: espektatè, kado, moun ki te monte sou sèn nan
export default async function AdminLiveDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const [{ data: all }, { data: row }, { data: views }, { data: guests }, { data: gifters }, { data: gifts }] = await Promise.all([
    supabase.rpc("admin_lives", { p_limit: 500 }),
    supabase.from("lives").select("total_views").eq("id", params.id).maybeSingle(),
    supabase.from("live_views").select("viewer_key, created_at, profiles(id, display_name, avatar_url)").eq("live_id", params.id).order("created_at").limit(1000),
    supabase.from("live_guests").select("id, guest_name, status, created_at").eq("live_id", params.id).order("created_at"),
    supabase.rpc("live_gifters", { p_live: params.id }),
    supabase.rpc("live_gift_breakdown", { p_live: params.id }),
  ]);
  const l = ((all ?? []) as AdminLive[]).find((x) => x.live_id === params.id);
  if (!l) notFound();

  const viewList = (views ?? []) as unknown as View[];
  const members = viewList.filter((v) => v.profiles);
  const anon = viewList.length - members.length;
  const totalViews = Math.max(Number(row?.total_views ?? 0), l.viewers);
  const giverList = (gifters ?? []) as Gifter[];
  const giftList = (gifts ?? []) as Breakdown[];
  const guestList = (guests ?? []) as Guest[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminTabs />
      <Link href="/admin/live" className="text-sm text-zinc-400 hover:text-white">
        ← Jesyon Live
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-md px-2 py-0.5 text-xs font-black ${l.is_on ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>
          {l.is_on ? "● LIVE" : l.status === "stopped" ? "KANPE" : "FINI"}
        </span>
        <h1 className="text-2xl font-extrabold text-white">{l.title ?? "Live san tit"}</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        <Link href={`/atis/${l.artist_id}`} className="font-semibold text-white hover:underline">
          {l.artist_name}
        </Link>{" "}
        · {when(l.started_at)} · {liveDuration(l.started_at, l.ended_at)}
      </p>
      {l.stop_reason && <p className="mt-2 text-sm text-red-300">Kanpe: {l.stop_reason}</p>}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="👥" label="Moun ki pase gade" value={formatCount(totalViews)} />
        <Stat icon="👁" label="Plis moun an menm tan" value={formatCount(l.peak_viewers)} />
        <Stat icon="❤️" label="Like" value={formatCount(Number(l.likes))} />
        <Stat icon="🎁" label="Kado" value={formatCount(l.gifts_count)} />
      </section>
      <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon="🪙" label="Valè kado yo" value={formatHTG(Number(l.gift_htg))} />
        <Stat icon="🎤" label="Pa atis la" value={formatHTG(Number(l.artist_htg))} />
        <Stat icon="💰" label="Pa UpMizik" value={formatHTG(Number(l.platform_htg))} />
      </section>

      {giftList.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {giftList.map((g) => (
            <li key={g.gift_id} className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200">
              {g.emoji} {g.name} <span className="font-bold text-white">x{Number(g.quantity)}</span> <span className="text-xs text-zinc-500">({Number(g.senders)} moun)</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="font-bold text-white">🎁 Moun ki voye kado ({giverList.length})</h2>
          {giverList.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Pèsonn.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {giverList.map((g) => (
                <li key={g.user_id} className="flex items-center gap-3 rounded-xl bg-zinc-950/70 p-3 text-sm">
                  <span>{g.emojis.slice(0, 8) || "🎁"}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{g.name}</span>
                  <span className="text-xs text-zinc-400 tabular-nums">
                    {Number(g.gifts)} kado · {Number(g.credits).toLocaleString("fr-HT")} kredi
                  </span>
                  {g.thanked && <span title="Atis la remèsye l">💌</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="font-bold text-white">👥 Moun ki te gade ({formatCount(totalViews)})</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {members.length} ak kont · {anon} san kont (vizitè)
          </p>
          {members.length > 0 && (
            <ul className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
              {members.map((v) => (
                <li key={v.viewer_key} className="flex items-center gap-2 rounded-lg bg-zinc-950/70 px-2 py-1.5 text-sm">
                  {v.profiles!.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.profiles!.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-300">{v.profiles!.display_name.slice(0, 1).toUpperCase()}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-white">{v.profiles!.display_name}</span>
                  <span className="text-xs text-zinc-500">{hour(v.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {guestList.length > 0 && (
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="font-bold text-white">🎤 Sèn nan (demann ak envitasyon)</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {guestList.map((g) => (
              <li key={g.id} className="rounded-full bg-zinc-950/70 px-3 py-1.5 text-sm text-zinc-200">
                {g.guest_name} <span className="text-xs text-zinc-500">· {GUEST_LABEL[g.status] ?? g.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
