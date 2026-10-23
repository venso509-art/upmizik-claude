import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { MonthBreakdown } from "@/components/admin/MonthBreakdown";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerifiedCorner } from "@/components/VerifiedCorner";
import { VerifyToggle } from "@/components/admin/VerifyToggle";
import { formatHTG } from "@/lib/donations";
import { MONEY_KEYS, currentMonthIso, monthLabel, monthParam, parseMonthParam, toNumbers, type MonthRow } from "@/lib/accounting";

export const metadata: Metadata = { title: "Admin: Kont atis | UpMizik" };
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SongRow = {
  song_id: string;
  title: string;
  is_owner: boolean;
  owner_name: string;
  plays: number;
  archived: boolean;
  donations_count: number;
  gross_htg: number;
  platform_htg: number;
  owner_htg: number;
  featuring_htg: number;
  collaborators_htg: number;
  this_artist_htg: number;
};

type Payout = { id: string; amount_htg: number; status: string; method: string; reference: string | null; created_at: string; processed_at: string | null };

function emptyMonth(month: string, artistId: string): MonthRow {
  return {
    month,
    artist_id: artistId,
    donations_count: 0,
    gross_htg: 0,
    platform_htg: 0,
    own_htg: 0,
    featuring_in_htg: 0,
    featuring_out_htg: 0,
    collaborators_htg: 0,
    fee_htg: 0,
    net_htg: 0,
    paid_htg: 0,
    closed: month < currentMonthIso(),
  };
}

export default async function AdminArtistAccountPage({ params, searchParams }: { params: { id: string }; searchParams: { mwa?: string; tout?: string } }) {
  if (!UUID_RE.test(params.id)) notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data: artist } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, status, is_verified, approved_at")
    .eq("id", params.id)
    .eq("role", "artist")
    .maybeSingle();
  if (!artist) notFound();

  const allTime = searchParams.tout === "1";
  const selected = parseMonthParam(searchParams.mwa) ?? currentMonthIso();

  const [monthsRes, songsRes, balanceRes, payoutsRes] = await Promise.all([
    supabase.rpc("finance_month_rows"),
    supabase.rpc("admin_artist_songs", { p_artist: artist.id, p_month: allTime ? null : selected }),
    supabase.rpc("artist_balance", { p_artist_id: artist.id }),
    supabase
      .from("payouts")
      .select("id, amount_htg, status, method, reference, created_at, processed_at")
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const months = ((monthsRes.data ?? []) as MonthRow[])
    .filter((m) => m.artist_id === artist.id)
    .map((m) => toNumbers(m, [...MONEY_KEYS]))
    .sort((a, b) => b.month.localeCompare(a.month));
  if (!months.some((m) => m.month === currentMonthIso())) months.unshift(emptyMonth(currentMonthIso(), artist.id));
  const row = months.find((m) => m.month === selected) ?? emptyMonth(selected, artist.id);

  const songs = ((songsRes.data ?? []) as SongRow[]).map((s) => ({
    ...s,
    donations_count: Number(s.donations_count),
    gross_htg: Number(s.gross_htg),
    platform_htg: Number(s.platform_htg),
    owner_htg: Number(s.owner_htg),
    featuring_htg: Number(s.featuring_htg),
    collaborators_htg: Number(s.collaborators_htg),
    this_artist_htg: Number(s.this_artist_htg),
  }));
  // Don ki pa sou okenn chante (atis la dirèkteman)
  const ownedGross = songs.filter((s) => s.is_owner).reduce((t, s) => t + s.gross_htg, 0);
  const directGross = allTime ? null : Math.max(0, Math.round((row.gross_htg - ownedGross) * 100) / 100);

  const b = (balanceRes.data as Record<string, number | string | null>[] | null)?.[0] ?? {};
  const available = Number(b.available_htg ?? 0);
  const pending = Number(b.pending_htg ?? 0);
  const paid = Number(b.paid_htg ?? 0);
  const eligibleFrom = b.eligible_from ? new Date(String(b.eligible_from)) : null;
  const payouts = (payoutsRes.data ?? []) as Payout[];

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
      active ? "border-citron-400 bg-citron-400 font-semibold text-zinc-950" : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />
      <Link href="/admin/kont" className="text-sm text-zinc-400 hover:text-white">
        ← Tout atis yo
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="relative shrink-0">
          <span className="block h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700">
            {artist.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-2xl font-bold text-white">{artist.display_name.charAt(0).toUpperCase()}</span>
            )}
          </span>
          <VerifiedCorner show={artist.is_verified} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center text-3xl font-extrabold tracking-tight text-white">
            {artist.display_name}
            {artist.is_verified && <VerifiedBadge size="lg" />}
          </h1>
          {artist.status === "approved" && (
            <div className="mt-1">
              <VerifyToggle artistId={artist.id} name={artist.display_name} verified={artist.is_verified} />
            </div>
          )}
          <p className="text-sm text-zinc-400">
            <Link href={`/atis/${artist.id}`} className="hover:text-white hover:underline">
              Paj piblik →
            </Link>
            {artist.approved_at && <> · Apwouve {new Date(artist.approved_at).toLocaleDateString("fr-HT", { dateStyle: "medium" })}</>}
          </p>
        </div>
      </div>

      {/* Balans lan: sa ekip la ka peye kounye a */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-citron-400/40 bg-citron-400/10 p-5">
          <p className="text-sm text-zinc-300">💵 Disponib pou peye</p>
          <p className="mt-2 text-3xl font-extrabold text-citron-300">{formatHTG(available)}</p>
          <p className="mt-1 text-[11px] text-zinc-400">Se MAKSIMÒM ekip la ka peye kounye a</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">⏳ Retrè ki an atant</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{formatHTG(pending)}</p>
          {pending > 0 && (
            <Link href="/admin/retre" className="mt-1 inline-block text-xs text-fuchsia-300 hover:underline">
              Trete l nan 💸 Retrè →
            </Link>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">✅ Total deja peye</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{formatHTG(paid)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">📅 Ka retire depi</p>
          <p className="mt-2 text-lg font-bold text-white">
            {eligibleFrom ? eligibleFrom.toLocaleDateString("fr-HT", { dateStyle: "medium" }) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">3 mwa apre apwobasyon</p>
        </div>
      </div>

      {/* Chwa mwa */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
        {months.map((m) => (
          <Link key={m.month} href={`/admin/kont/${artist.id}?mwa=${monthParam(m.month)}`} className={chip(!allTime && m.month === selected)}>
            {monthLabel(m.month)}
            {!m.closed && " · kounye a"}
          </Link>
        ))}
        <Link href={`/admin/kont/${artist.id}?tout=1`} className={chip(allTime)}>
          ♾️ Tout tan
        </Link>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <h2 className="mb-3 text-lg font-bold text-white">🧮 {allTime ? "Chwazi yon mwa pou kalkil la" : `Kalkil ${monthLabel(selected)}`}</h2>
          {allTime ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-400">Kalkil detaye a fèt mwa pa mwa. Chwazi yon mwa anlè a.</p>
          ) : (
            <MonthBreakdown row={row} />
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold text-white">🎵 Chante yo {allTime ? "(tout tan)" : `(${monthLabel(selected)})`}</h2>
          {songs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-400">Pa gen chante.</p>
          ) : (
            <ul className="space-y-2">
              {songs.map((s) => (
                <li key={s.song_id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/chante/${s.song_id}`} className="font-semibold text-white hover:underline">
                      {s.title}
                    </Link>
                    <span className="text-xs text-zinc-500">
                      {!s.is_owner && <>🎤 Featuring sou chante {s.owner_name} · </>}
                      {s.archived && "⏸ An poz · "}🎧 {s.plays.toLocaleString("fr-HT")} · 💝 {s.donations_count} don
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Total don</dt>
                      <dd className="tabular-nums text-white">{formatHTG(s.gross_htg)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">UpMizik 15%</dt>
                      <dd className="tabular-nums text-zinc-300">{formatHTG(s.platform_htg)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Owner</dt>
                      <dd className="tabular-nums text-zinc-300">{formatHTG(s.owner_htg)}</dd>
                    </div>
                    {s.featuring_htg > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Featuring</dt>
                        <dd className="tabular-nums text-zinc-300">{formatHTG(s.featuring_htg)}</dd>
                      </div>
                    )}
                    {s.collaborators_htg > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">Kolaboratè</dt>
                        <dd className="tabular-nums text-zinc-300">{formatHTG(s.collaborators_htg)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 font-semibold">
                      <dt className="text-citron-300">Pa {artist.display_name}</dt>
                      <dd className="tabular-nums text-citron-300">{formatHTG(s.this_artist_htg)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
              {directGross !== null && directGross > 0 && (
                <li className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-300">
                  💝 Don dirèk (pa sou okenn chante): <span className="font-semibold text-white">{formatHTG(directGross)}</span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Istwa retrè yo */}
      <h2 className="mt-10 text-lg font-bold text-white">💸 Dènye retrè yo</h2>
      {payouts.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Pa gen retrè ankò.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-800/70 rounded-2xl border border-zinc-800">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="text-zinc-300">
                {new Date(p.created_at).toLocaleDateString("fr-HT", { dateStyle: "medium" })} · {p.method === "moncash" ? "MonCash" : "NatCash"}
                {p.reference && <span className="text-zinc-500"> · Ref: {p.reference}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-white">{formatHTG(Number(p.amount_htg))}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : p.status === "pending" ? "bg-amber-500/15 text-amber-300" : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {p.status === "paid" ? "Peye" : p.status === "pending" ? "An atant" : "Rejte"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
