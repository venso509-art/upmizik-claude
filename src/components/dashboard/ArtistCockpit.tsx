"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { shareLink } from "@/lib/share";
import { formatHTG } from "@/lib/donations";
import { PLAY_LEVELS, formatPlays, progressFor } from "@/lib/levels";

// ===== Tèt dashboard atis la ("kòkpit"): foto, grafik 30 jou, chif yo, balans, objektif, bouton rapid =====

type Props = {
  artistId: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  pro: boolean;
  greeting: string;
  totalPlays: number;
  songs: number;
  comments: number;
  followers: number | null; // null = pa Pro (pa gen bouton Abone)
  availableHtg: number;
  monthHtg: number; // revni mwa sa a (ap vin disponib apre mwa a fini)
  daily: { day: string; plays: number }[]; // 30 dènye jou yo
  memberCode: string | null;
  shareText: string;
};

// Chif la monte soti 0 (~1 s)
function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("fr-HT") }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(value);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1000);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

const svg = (d: React.ReactNode, cls = "h-5 w-5") => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
    {d}
  </svg>
);
const I = {
  plus: svg(<path d="M12 5v14M5 12h14" />, "h-6 w-6"),
  live: svg(
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5" />
    </>,
  ),
  eye: svg(
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  edit: svg(<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />),
  heart: svg(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />),
  headphones: svg(<path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3z" />),
  disc: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
    </>,
  ),
  chat: svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
  users: svg(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5" />
    </>,
  ),
};

// Grafik ekout 30 jou yo (zòn ak degrade, ki trase poukont li)
function Sparkline({ data }: { data: { day: string; plays: number }[] }) {
  const W = 600;
  const H = 120;
  const max = Math.max(1, ...data.map((d) => d.plays));
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const pts = data.map((d, i) => [i * step, H - 8 - (d.plays / max) * (H - 24)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const [hover, setHover] = useState<number | null>(null);
  const h = hover ?? data.length - 1;
  const ref = useRef<SVGSVGElement>(null);

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-28 w-full overflow-visible"
        onPointerMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Ekout chak jou, 30 dènye jou yo"
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="spark-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-fill)" className="motion-safe:animate-fade-up" />
        <path d={line} fill="none" stroke="url(#spark-line)" strokeWidth={3} vectorEffect="non-scaling-stroke" className="motion-safe:animate-fade-up" />
        {pts[h] && (
          <>
            <line x1={pts[h][0]} x2={pts[h][0]} y1={0} y2={H} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <circle cx={pts[h][0]} cy={pts[h][1]} r={5} fill="#FFD700" stroke="#0B132B" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {data[h] && (
        <p className="mt-1 text-right text-xs text-zinc-400">
          {new Date(`${data[h].day}T12:00:00Z`).toLocaleDateString("fr-HT", { day: "numeric", month: "short" })}:{" "}
          <span className="font-bold text-white">{data[h].plays.toLocaleString("fr-HT")} ekout</span>
        </p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, hint, delay }: { icon: React.ReactNode; label: string; value: number; color: string; hint?: string; delay: number }) {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition duration-300 motion-safe:animate-fade-up hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl transition group-hover:opacity-40`} aria-hidden />
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg shadow-black/30 transition group-hover:scale-110`}>{icon}</span>
      <p className="mt-4 text-3xl font-black tracking-tight text-white tabular-nums sm:text-4xl">
        <CountUp value={value} />
      </p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-400">{label}</p>
      {hint && <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function ArtistCockpit(p: Props) {
  const [copied, setCopied] = useState(false);
  const recent = p.daily.reduce((s, d) => s + d.plays, 0);
  const half = Math.floor(p.daily.length / 2);
  const before = p.daily.slice(0, half).reduce((s, d) => s + d.plays, 0);
  const after = p.daily.slice(half).reduce((s, d) => s + d.plays, 0);
  const trend = before > 0 ? Math.round(((after - before) / before) * 100) : after > 0 ? 100 : 0;
  const lvl = progressFor("plays", p.totalPlays);
  const pctLvl = Math.round(lvl.progress * 100);

  const actions = [
    { href: `/atis/${p.artistId}`, label: "Paj piblik mwen", icon: I.eye, color: "from-sky-400 to-blue-600" },
    { href: "/pwofil", label: "Modifye pwofil", icon: I.edit, color: "from-zinc-300 to-zinc-500" },
    { href: p.pro ? "/live/nouvo" : "/pwofil", label: p.pro ? "Fè yon live" : "Live (Pro)", icon: I.live, color: "from-red-500 to-rose-700" },
  ];

  return (
    <section aria-label="Rezime atis la" className="space-y-5">
      {/* ===== GWO KAT AKÈY LA ===== */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0B132B] via-[#0D1F3A] to-[#0A5C36]/70 p-6 shadow-2xl shadow-black/40 sm:p-8">
        {/* Dekorasyon: limyè + kadriyaj fen */}
        <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#FFD700]/15 blur-3xl motion-safe:animate-blob-drift" aria-hidden />
        <span className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl motion-safe:animate-blob-drift" style={{ animationDelay: "-6s" }} aria-hidden />
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "36px 36px" }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Foto a nan yon wonn koulè k ap vire dousman */}
            <span className="relative shrink-0">
              <span className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#FFD700,#34D399,#38BDF8,#FFD700)] motion-safe:animate-[spin_8s_linear_infinite]" aria-hidden />
              <span className="relative block h-20 w-20 overflow-hidden rounded-full border-4 border-[#0B132B] bg-zinc-800 sm:h-24 sm:w-24">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-3xl font-black text-white">{p.name.charAt(0).toUpperCase()}</span>
                )}
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD700]">🎤 Espas atis</p>
              <h1 className="mt-1 break-words text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                {p.greeting}, {p.name}!
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.verified && <span className="rounded-full bg-[#1D9BF0]/20 px-2.5 py-1 text-[11px] font-bold text-sky-200 ring-1 ring-[#1D9BF0]/40">✓ Verifye</span>}
                {p.pro && <span className="rounded-full bg-[#FFD700]/15 px-2.5 py-1 text-[11px] font-bold text-[#FFD700] ring-1 ring-[#FFD700]/40">⭐ Pro</span>}
                <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/10">
                  {lvl.current.emoji} {lvl.current.name}
                </span>
                {p.memberCode && (
                  <Link href="/manm/dashboard" className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/40 hover:bg-emerald-400/25">
                    🤝 Manm · {p.memberCode}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Bouton rapid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[30rem]">
            <Link
              href="/upload"
              className="group col-span-2 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#FFE34D] to-[#E6C000] px-4 py-3.5 font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/25 transition hover:-translate-y-0.5 hover:shadow-xl sm:col-span-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B132B] text-[#FFD700] transition group-hover:rotate-90">{I.plus}</span>
              <span className="min-w-0">
                <span className="block leading-tight">Pibliye yon nouvo chante</span>
                <span className="block text-xs font-bold opacity-70">Fanatik ou yo ap tann</span>
              </span>
              <span className="ml-auto text-xl transition group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </Link>
            {actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.05] px-2 py-3 text-center text-xs font-bold text-white ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/[0.09]"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${a.color} shadow-lg shadow-black/30 transition group-hover:scale-110`}>{a.icon}</span>
                {a.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={async () => {
                if ((await shareLink(`/don/${p.artistId}`, `Sipòte ${p.name} sou UpMizik`, p.shareText)) === "copied") {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.05] px-2 py-3 text-center text-xs font-bold text-white ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/[0.09]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-lg shadow-black/30 transition group-hover:scale-110">{I.heart}</span>
              {copied ? "Lyen kopye ✓" : "Lyen don mwen"}
            </button>
          </div>
        </div>

        {/* Grafik 30 jou */}
        <div className="relative mt-6 rounded-3xl bg-black/20 p-4 ring-1 ring-white/10 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ekout 30 dènye jou yo</p>
              <p className="mt-1 text-3xl font-black text-white tabular-nums">
                <CountUp value={recent} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black ${
                  trend > 0 ? "bg-emerald-400/15 text-emerald-300" : trend < 0 ? "bg-red-400/15 text-red-300" : "bg-white/10 text-zinc-300"
                }`}
                title="15 dènye jou yo, konpare ak 15 jou anvan yo"
              >
                {trend > 0 ? "▲" : trend < 0 ? "▼" : "■"} {Math.abs(trend)} %
              </span>
              <Link href="/dashboard/estatistik" className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-bold text-white ring-1 ring-white/10 hover:bg-white/[0.12]">
                📈 Detay
              </Link>
            </div>
          </div>
          <div className="mt-3">{p.daily.length > 1 ? <Sparkline data={p.daily} /> : <p className="py-8 text-center text-sm text-zinc-500">Grafik la ap parèt depi w gen premye ekout ou yo.</p>}</div>
        </div>
      </div>

      {/* ===== CHIF YO ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={I.headphones} label="Total ekout" value={p.totalPlays} color="from-[#FFE34D] to-[#E6C000]" delay={0.05} />
        <StatCard icon={I.disc} label="Chante" value={p.songs} color="from-emerald-400 to-[#0A5C36]" delay={0.1} />
        <StatCard icon={I.chat} label="Kòmantè" value={p.comments} color="from-sky-400 to-blue-600" delay={0.15} />
        {p.followers === null ? (
          <Link href="/pwofil" className="group relative overflow-hidden rounded-3xl border border-dashed border-[#FFD700]/50 bg-[#FFD700]/[0.05] p-5 transition hover:-translate-y-1 motion-safe:animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE34D] to-[#E6C000] text-[#0B132B]">{I.users}</span>
            <p className="mt-4 text-lg font-black text-[#FFD700]">Abone yo</p>
            <p className="mt-0.5 text-sm text-zinc-400">Vin Pro pou fanatik yo ka abone nan ou →</p>
          </Link>
        ) : (
          <StatCard icon={I.users} label="Abone" value={p.followers} color="from-fuchsia-500 to-pink-600" delay={0.2} />
        )}
      </div>

      {/* ===== BALANS + OBJEKTIF ===== */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Kat balans: tankou yon kat bank an lò */}
        <Link
          href="/dashboard/finans"
          className="group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#FFE34D] via-[#FFD700] to-[#C9A400] p-6 text-[#0B132B] shadow-2xl shadow-[#FFD700]/20 transition duration-300 hover:-translate-y-1 hover:rotate-[-0.5deg] motion-safe:animate-fade-up"
        >
          <span className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[18px] border-white/25" aria-hidden />
          <span className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/20 blur-2xl" aria-hidden />
          {/* reflè limyè ki pase */}
          <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/40 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" aria-hidden />
          <div className="relative flex items-start justify-between">
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Balans disponib</span>
            {/* "chip" kat la */}
            <span className="grid h-8 w-11 grid-cols-3 gap-px overflow-hidden rounded-md bg-[#0B132B]/20 p-1" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="rounded-[2px] bg-[#0B132B]/30" />
              ))}
            </span>
          </div>
          <p className="relative mt-5 text-4xl font-black tracking-tight tabular-nums sm:text-5xl">
            <CountUp value={p.availableHtg} format={(n) => formatHTG(Math.round(n))} />
          </p>
          <div className="relative mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">Mwa sa a</p>
              <p className="font-black tabular-nums">{formatHTG(p.monthHtg)}</p>
            </div>
            <span className="rounded-full bg-[#0B132B] px-4 py-2 text-sm font-black text-[#FFD700] transition group-hover:scale-105">Mande retrè →</span>
          </div>
          <p className="relative mt-4 font-mono text-xs tracking-[0.3em] opacity-60">UPMIZIK · {p.name.toUpperCase().slice(0, 18)}</p>
        </Link>

        {/* Objektif: pwochen nivo ekout la */}
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 motion-safe:animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black text-white">🎯 Objektif ou</h2>
            <span className="text-sm text-zinc-400">{lvl.next ? `Pwochen: ${lvl.next.emoji} ${lvl.next.name}` : "Ou rive nan pi wo nivo a! 👑"}</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-4xl font-black tabular-nums text-[#FFD700]">
              {formatPlays(p.totalPlays)}
              {lvl.next && <span className="text-xl font-bold text-zinc-300"> / {formatPlays(lvl.next.threshold)} ekout</span>}
            </p>
            <p className="text-2xl font-black tabular-nums text-white">{pctLvl}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#0B132B]" role="progressbar" aria-valuenow={pctLvl} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full origin-left rounded-full bg-gradient-to-r from-emerald-400 to-[#FFD700] motion-safe:animate-bar-grow" style={{ width: `${pctLvl}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {PLAY_LEVELS.slice(1).map((l) => {
              const reached = p.totalPlays >= l.threshold;
              return (
                <span
                  key={l.threshold}
                  title={l.name}
                  className={`rounded-xl py-2 text-center text-[11px] font-black ${reached ? "bg-[#FFD700] text-[#0B132B]" : "bg-white/[0.04] text-zinc-300 ring-1 ring-white/10"}`}
                >
                  {l.emoji} {formatPlays(l.threshold)}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-zinc-300">
            {lvl.next
              ? `Ankò ${(lvl.next.threshold - p.totalPlays).toLocaleString("fr-HT")} ekout pou w vin « ${lvl.next.name} ». Pataje mizik ou jodi a!`
              : "Bravo! Ou se yon lejand sou UpMizik."}
          </p>
        </div>
      </div>

      {/* ===== ALE DIRÈK NAN YON SEKSYON ===== */}
      <nav aria-label="Seksyon dashboard la" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[
          ["#mesaj", "✨ Mesaj jounen an"],
          ["#stati", "⏳ Stati"],
          ["#nouvo-pos", "💬 Pòs"],
          ["#boost", "🔥 Boost"],
          ["#nivo", "🏅 Nivo"],
          ["#chante", "🎵 Chante mwen"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="shrink-0 rounded-full bg-white/[0.05] px-4 py-2 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-[#FFD700] hover:text-[#0B132B]">
            {label}
          </a>
        ))}
      </nav>
    </section>
  );
}
