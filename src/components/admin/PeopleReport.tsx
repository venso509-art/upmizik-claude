"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatHTG, formatUSD } from "@/lib/donations";

// ===== Rapò: KONT PA MOUN (atis + manm afilye) =====
// Pou chak moun: sa ki antre pou li, sa ki pou li, sa ki pou sit la, sa ki deja peye, ak sa ki RETE pou peye jodi a.

export type PersonArtist = {
  artist_id: string;
  name: string;
  avatar_url: string | null;
  don_count: number;
  don_gross: number;
  don_site: number;
  earn_don: number;
  live_count: number;
  live_gross: number;
  live_artist: number;
  paid_htg: number;
  available_htg: number;
  pending_htg: number;
  month_htg: number;
  detail: { k: "don" | "live"; at: string; label: string; gross: number; mine: number; site: number }[];
};

export type PersonMember = {
  member_id: string;
  user_id: string;
  name: string;
  full_name: string;
  pseudo: string | null;
  phone: string;
  status: string;
  objective: number;
  referred: number;
  reg_htg: number;
  member_usd: number;
  member_htg: number;
  site_htg: number;
  paid_usd: number;
  paid_htg: number;
  owed_usd: number;
  current_usd: number;
  detail: { name: string; at: string; usd: number; reg_htg: number; usd_htg: number }[];
};

const n = (v: unknown) => Number(v ?? 0);
const htg = (v: number) => formatHTG(Math.round(v * 100) / 100);
const DATE = new Intl.DateTimeFormat("fr-HT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" });

function Avatar({ src, name }: { src: string | null; name: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-[#0A5C36] text-sm font-black text-white ring-2 ring-white/10">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

// Ti kare chif (Antre / Pou li / Sit la / Peye / Rete)
function Cell({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`truncate text-sm font-black tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function ArtistRow({ a }: { a: PersonArtist }) {
  const [open, setOpen] = useState(false);
  const total = n(a.don_gross) + n(a.live_gross);
  const mine = n(a.earn_don) + n(a.live_artist);
  const site = n(a.don_site) + (n(a.live_gross) - n(a.live_artist));
  const owed = n(a.available_htg);
  return (
    <li className={`overflow-hidden rounded-2xl border transition ${open ? "border-citron-400/40 bg-zinc-900/80" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-4 p-4 text-left">
        <Avatar src={a.avatar_url} name={a.name} />
        <span className="min-w-[8rem] flex-1">
          <span className="block truncate font-bold text-white">{a.name}</span>
          <span className="block text-xs text-zinc-500">
            💝 {n(a.don_count)} don · 🔴 {n(a.live_count)} live
          </span>
        </span>
        <span className="grid flex-[2] grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
          <Cell label="Antre" value={htg(total)} />
          <Cell label="Pou li" value={htg(mine)} tone="text-emerald-300" />
          <Cell label="Sit la" value={htg(site)} tone="text-citron-300" />
          <Cell label="Peye" value={htg(n(a.paid_htg))} tone="text-zinc-300" />
          <Cell label="Rete pou peye" value={htg(owed)} tone={owed > 0 ? "text-red-300" : "text-zinc-500"} />
        </span>
        <span className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 p-4 motion-safe:animate-fade-up">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p className="rounded-xl bg-zinc-950/50 px-3 py-2 text-zinc-300">
              💝 Don: <strong className="text-white">{htg(n(a.don_gross))}</strong>
              <span className="block text-xs text-zinc-500">Pa li (ak featuring): {htg(n(a.earn_don))} · sit la: {htg(n(a.don_site))}</span>
            </p>
            <p className="rounded-xl bg-zinc-950/50 px-3 py-2 text-zinc-300">
              🔴 Kado live: <strong className="text-white">{htg(n(a.live_gross))}</strong>
              <span className="block text-xs text-zinc-500">Pa li: {htg(n(a.live_artist))} · sit la: {htg(n(a.live_gross) - n(a.live_artist))}</span>
            </p>
            <p className="rounded-xl bg-zinc-950/50 px-3 py-2 text-zinc-300">
              ⏳ Retrè l mande: <strong className="text-white">{htg(n(a.pending_htg))}</strong>
              <span className="block text-xs text-zinc-500">Mwa sa a (ap vin disponib): {htg(n(a.month_htg))}</span>
            </p>
          </div>
          {a.detail.length > 0 ? (
            <ul className="mt-3 divide-y divide-zinc-800/70 rounded-xl border border-zinc-800">
              {a.detail.map((d, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                  <span className="w-28 shrink-0 text-xs text-zinc-500">{DATE.format(new Date(d.at))}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${d.k === "don" ? "bg-pink-500/15 text-pink-300" : "bg-red-500/15 text-red-300"}`}>
                    {d.k === "don" ? "💝 Don" : "🔴 Live"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-zinc-200">{d.label}</span>
                  <span className="tabular-nums text-white">{htg(n(d.gross))}</span>
                  <span className="w-28 text-right text-xs tabular-nums text-emerald-300">pa li {htg(n(d.mine))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Pa gen don ni live nan peryòd sa a.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/admin/kont/${a.artist_id}`} className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-citron-400 hover:text-white">
              💼 Kont atis la
            </Link>
            {(owed > 0 || n(a.pending_htg) > 0) && (
              <Link href="/admin/retre" className="rounded-full bg-citron-400 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-citron-300">
                💸 Peye l nan Retrè
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function MemberRow({ m }: { m: PersonMember }) {
  const [open, setOpen] = useState(false);
  const owed = n(m.owed_usd);
  return (
    <li className={`overflow-hidden rounded-2xl border transition ${open ? "border-citron-400/40 bg-zinc-900/80" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-4 p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-citron-300 to-citron-500 text-sm font-black text-zinc-950">🤝</span>
        <span className="min-w-[8rem] flex-1">
          <span className="block truncate font-bold text-white">{m.name}</span>
          <span className="block text-xs text-zinc-500">
            {m.pseudo ?? "san pseudo"} · 🎤 {n(m.referred)} atis {m.status !== "approved" && `· ${m.status}`}
          </span>
        </span>
        <span className="grid flex-[2] grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
          <Cell label="Antre" value={htg(n(m.reg_htg))} />
          <Cell label="Pou li" value={formatUSD(n(m.member_usd))} tone="text-emerald-300" />
          <Cell label="Sit la" value={htg(n(m.site_htg))} tone="text-citron-300" />
          <Cell label="Peye" value={formatUSD(n(m.paid_usd))} tone="text-zinc-300" />
          <Cell label="Rete pou peye" value={formatUSD(owed)} tone={owed > 0 ? "text-red-300" : "text-zinc-500"} />
        </span>
        <span className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 p-4 motion-safe:animate-fade-up">
          <p className="text-sm text-zinc-300">
            Vrè non: <strong className="text-white">{m.full_name}</strong> · 📱{" "}
            <a href={`https://wa.me/${m.phone.replace(/\D/g, "")}`} className="text-emerald-300 hover:underline">
              {m.phone}
            </a>{" "}
            · Objektif: {m.objective} atis/mwa
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Pa li: {formatUSD(n(m.member_usd))} ≈ {htg(n(m.member_htg))} · Mwa sa a (ap peye apre mwa a fini): {formatUSD(n(m.current_usd))}
          </p>
          {m.detail.length > 0 ? (
            <ul className="mt-3 divide-y divide-zinc-800/70 rounded-xl border border-zinc-800">
              {m.detail.map((d, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                  <span className="w-28 shrink-0 text-xs text-zinc-500">{DATE.format(new Date(d.at))}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-200">🎤 {d.name}</span>
                  <span className="text-xs tabular-nums text-zinc-400">enskripsyon {htg(n(d.reg_htg))}</span>
                  <span className="w-24 text-right text-sm font-bold tabular-nums text-emerald-300">{formatUSD(n(d.usd))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Pa gen atis ki konte pou li nan peryòd sa a.</p>
          )}
          <div className="mt-3">
            <Link href="/admin/manm?status=approved" className="inline-block rounded-full bg-citron-400 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-citron-300">
              💸 Peye l nan Manm afilye
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

export function PeopleReport({ artists, members, error }: { artists: PersonArtist[]; members: PersonMember[]; error?: boolean }) {
  const [tab, setTab] = useState<"atis" | "manm">("atis");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shownArtists = useMemo(() => artists.filter((a) => !needle || a.name.toLowerCase().includes(needle)), [artists, needle]);
  const shownMembers = useMemo(
    () => members.filter((m) => !needle || [m.name, m.full_name, m.pseudo ?? ""].some((v) => v.toLowerCase().includes(needle))),
    [members, needle],
  );
  const owedArtists = artists.reduce((s, a) => s + n(a.available_htg), 0);
  const owedMembers = members.reduce((s, m) => s + n(m.owed_usd), 0);

  return (
    <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6" aria-labelledby="people-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="people-title" className="text-2xl font-extrabold tracking-tight text-white">
            👥 Kont pa moun
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Klike sou yon moun pou w wè tout detay li. « Rete pou peye » = sa li dwe resevwa jodi a.</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Chache yon non…"
          className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 text-sm text-white placeholder:text-zinc-500 focus:border-citron-400 focus:outline-none sm:w-60"
        />
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          ⚠️ Seksyon sa a poko pare: kouri migration <span className="font-mono">20270101000005_people_accounts.sql</span> nan Supabase.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {(
              [
                ["atis", "🎤 Atis yo", `${artists.length} atis · rete pou peye ${htg(owedArtists)}`],
                ["manm", "🤝 Manm afilye", `${members.length} manm · rete pou peye ${formatUSD(owedMembers)}`],
              ] as const
            ).map(([k, label, sub]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                aria-pressed={tab === k}
                className={`rounded-2xl px-4 py-3 text-left transition ${tab === k ? "bg-citron-400 text-zinc-950 shadow-lg shadow-citron-400/20" : "bg-white/[0.04] text-white ring-1 ring-white/10 hover:bg-white/[0.07]"}`}
              >
                <span className="block font-black">{label}</span>
                <span className={`block text-xs ${tab === k ? "text-zinc-950/70" : "text-zinc-400"}`}>{sub}</span>
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {tab === "atis" ? (
              shownArtists.length ? (
                shownArtists.map((a) => <ArtistRow key={a.artist_id} a={a} />)
              ) : (
                <li className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">Pa gen atis ki gen lajan nan peryòd sa a.</li>
              )
            ) : shownMembers.length ? (
              shownMembers.map((m) => <MemberRow key={m.member_id} m={m} />)
            ) : (
              <li className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">Pa gen manm nan peryòd sa a.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
