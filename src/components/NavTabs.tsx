"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Onglè navigasyon ant paj yon menm seksyon (dashboard atis, panèl admin)
export function NavTabs({ tabs }: { tabs: { href: string; label: string; badge?: number }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-zinc-800">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
              active ? "border-fuchsia-500 text-white" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
            {t.badge ? <span className="rounded-full bg-amber-500 px-1.5 text-xs font-bold text-zinc-950">{t.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
