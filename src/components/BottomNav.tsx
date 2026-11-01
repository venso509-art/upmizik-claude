"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ikòn yo: liy (pa aktif) oswa ranpli (aktif), tankou yon app mobil
function HomeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M11.3 2.7a1 1 0 0 1 1.4 0l8.5 8a1 1 0 0 1 .3.7V20a2 2 0 0 1-2 2h-4.5v-6.5h-6V22H4.5a2 2 0 0 1-2-2v-8.6a1 1 0 0 1 .3-.7l8.5-8Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden>
      <path d="M3.5 11.4 12 3.5l8.5 7.9V20a1 1 0 0 1-1 1h-4.5v-6.5h-6V21H4.5a1 1 0 0 1-1-1v-8.6Z" />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={active ? "currentColor" : "none"} />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" />
    </svg>
  );
}

function TreeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" aria-hidden>
      <path d="M12 2.5 7.5 9h2.5L6 14.5h3.5L5 20.5h14l-4.5-6H18L14 9h2.5L12 2.5Z" />
      <path d="M12 20.5V22" strokeLinecap="round" />
    </svg>
  );
}

const ITEMS = [
  { href: "/", label: "Akèy", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/atis", label: "Atis", Icon: MicIcon, match: (p: string) => p === "/atis" || p.startsWith("/atis/") },
  // 🎄 Konkou Nwèl nan plas Sosyal (Sosyal toujou nan meni ☰ a)
  { href: "/konkou", label: "Nwèl", Icon: TreeIcon, match: (p: string) => p.startsWith("/konkou") },
];

// Ba navigasyon anba ekran an (telefòn sèlman)
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasyon prensipal"
      className="fixed inset-x-0 bottom-0 z-50 transform-gpu border-t border-white/5 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:scale-95 ${
                  active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {/* Ti ba gradyan anlè opsyon ki aktif la */}
                <span
                  className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                  aria-hidden
                />
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-fuchsia-500/15 text-fuchsia-300" : ""}`}>
                  <Icon active={active} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
