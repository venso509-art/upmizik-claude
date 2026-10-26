import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";
import { SocialIcons } from "./SocialIcons";

// Ikòn liy (menm stil toupatou), olye emoji
const icon = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const I = {
  home: icon(
    <>
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
    </>,
  ),
  sparkle: icon(<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />),
  mic: icon(
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10a7 7 0 0 1-14 0M12 17v5" />
    </>,
  ),
  chat: icon(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
  search: icon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>,
  ),
  download: icon(<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />),
  star: icon(<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />),
  grid: icon(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
  ),
  upload: icon(<path d="M12 21V9m0 0-4 4m4-4 4 4M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />),
  live: icon(
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
    </>,
  ),
  mail: icon(
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>,
  ),
};

type FooterLink = { href: string; label: string; icon: React.ReactNode; badge?: string };

// Yon kolòn lyen: tit ak ti ba koulè, epi chak lyen gen yon ti kare ikòn ki vin jòn lè w pase sou li
function FooterLinks({ title, accent, links }: { title: string; accent: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-white">
        <span className={`h-4 w-1 rounded-full ${accent}`} aria-hidden />
        {title}
      </p>
      <ul className="mt-5 space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group flex items-center gap-2.5 rounded-xl py-1.5 pr-1 text-sm font-medium text-zinc-300 transition hover:text-white sm:gap-3 sm:pr-2 sm:text-[15px]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] sm:h-9 sm:w-9 text-zinc-300 ring-1 ring-white/10 transition duration-200 group-hover:scale-105 group-hover:bg-citron-400 group-hover:text-zinc-950 group-hover:ring-citron-300">
                {l.icon}
              </span>
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">{l.label}</span>
              {l.badge && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{l.badge}</span>}
              <span className="ml-auto hidden text-citron-300 opacity-0 sm:inline transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name, role").eq("id", user.id).single()
    : { data: null };
  const year = new Date().getFullYear();
  const isArtist = profile?.role === "artist";

  return (
    // pb-24: pou ba lektè a (fiks anba ekran an) pa kouvri dènye liy lan; pb-44 sou telefòn pou ba navigasyon an tou
    <footer className="relative mt-16 overflow-hidden border-t border-white/10 bg-zinc-950/50 pb-44 backdrop-blur-sm md:pb-24">
      {/* Ti limyè dèyè footer a */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-fuchsia-600/10 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* ===== GWO KAT ENVITASYON (atis) ===== */}
        <div className="relative -mb-2 mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-700 via-fuchsia-800 to-[#0B132B] p-6 shadow-2xl shadow-fuchsia-950/40 ring-1 ring-white/10 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-citron-400/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" aria-hidden />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFE34D] ring-1 ring-white/15">
                🎤 {isArtist ? "Espas atis" : "Atis, sa a se pou ou"}
              </p>
              <h2 className="mt-3 text-balance text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                {isArtist ? (
                  <>
                    Fanatik ou yo ap tann <span className="text-[#FFE34D]">pwochen chante w</span>.
                  </>
                ) : (
                  <>
                    Yo renmen mizik ou. Kounye a yo ka <span className="text-[#FFE34D]">sipòte w</span>.
                  </>
                )}
              </h2>
              <p className="mt-2 max-w-lg text-sm text-white/75">
                {isArtist ? "Pibliye yon chante, fè yon live, oswa poste yon stati pou rete pre fanatik ou yo." : "Kreye paj atis ou gratis. Resevwa sipò sou MonCash ak NatCash."}
              </p>
            </div>
            <Link
              href={isArtist ? "/upload" : "/enskri?wol=atis"}
              className="btn-primary inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3.5 text-base font-black shadow-xl shadow-citron-500/20 transition hover:scale-[1.03]"
            >
              {isArtist ? "Pibliye yon chante" : "Enskri gratis"} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-12 pb-12 pt-14 lg:grid-cols-[1.35fr_1fr_1fr_1.5fr] lg:gap-x-10">
          {/* Mak la + rezo sosyal */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="" width={40} height={40} className="h-10 w-10 rounded-full bg-white object-cover ring-2 ring-citron-400/40" />
              <span>
                <span className="bg-gradient-to-r from-citron-300 to-citron-500 bg-clip-text text-transparent">Up</span>
                <span className="text-white">Mizik</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-zinc-400">
              Platfòm mizik <span className="font-semibold text-white">100% ayisyen</span>. Koute, sipòte atis yo, epi pataje bèl mizik nou an ak mond lan.
            </p>
            <div className="mt-6">
              <SocialIcons />
            </div>
          </div>

          <FooterLinks
            title="Dekouvri"
            accent="bg-citron-400"
            links={[
              { href: "/", label: "Akèy", icon: I.home },
              { href: "/#nouvo", label: "Nouvo mizik", icon: I.sparkle },
              { href: "/atis", label: "Atis yo", icon: I.mic },
              { href: "/live", label: "Live", icon: I.live, badge: "LIVE" },
              { href: "/sosyal", label: "Sosyal", icon: I.chat },
              { href: "/chache", label: "Chache", icon: I.search },
              { href: "/telechaje", label: "Mizik offline", icon: I.download },
            ]}
          />

          <FooterLinks
            title="Pou atis"
            accent="bg-fuchsia-500"
            links={[
              { href: "/enskri?wol=atis", label: "Enskri kòm atis", icon: I.star },
              { href: "/dashboard", label: "Espas atis", icon: I.grid },
              { href: "/upload", label: "Pibliye yon chante", icon: I.upload },
              { href: "/live/nouvo", label: "Fè yon live", icon: I.live },
            ]}
          />

          {/* Newsletter + estati koneksyon */}
          <div className="col-span-2 lg:col-span-1">
            <p className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-white">
              <span className="h-4 w-1 rounded-full bg-sky-400" aria-hidden />
              Newsletter
            </p>
            <div className="mt-5 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-citron-400 text-zinc-950">{I.mail}</span>
                Pa rate okenn nouvo mizik
              </p>
              <p className="mt-2 text-sm text-zinc-400">Nouvo chante ak nouvèl UpMizik dirèkteman nan imèl ou.</p>
              <div className="mt-4">
                <NewsletterForm />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
              {user ? (
                <>
                  <span className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                    Anliy
                  </span>
                  <span className="min-w-0 truncate text-sm text-zinc-300">{profile?.display_name ?? user.email}</span>
                  <Link href={isArtist ? "/dashboard" : "/pwofil"} className="ml-auto text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300">
                    {isArtist ? "Espas atis →" : "Pwofil →"}
                  </Link>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                    Ou pa konekte
                  </span>
                  <Link href="/konekte" className="ml-auto rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15">
                    Konekte
                  </Link>
                  <Link href="/enskri" className="btn-primary rounded-full px-3.5 py-1.5 text-xs font-bold transition">
                    Enskri
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dènye liy lan */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-zinc-500 sm:flex-row">
          <p className="flex items-center gap-2">
            © {year} UpMizik · <span className="text-zinc-400">Fèt ak ❤️ an Ayiti</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-white/10">MonCash</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-white/10">NatCash</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            >
              {I.mail} {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
