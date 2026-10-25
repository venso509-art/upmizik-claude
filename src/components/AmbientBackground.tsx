"use client";

import { usePathname } from "next/navigation";

// Fon "premium" ki kouvri TOUT longè paj la (header → footer), tankou yon sèl gwo degradasyon fluid:
// Nwa Ble (#0B132B) anlè → Vèt Fonse (#0A5C36) anba, ak limyè jòn (#FFD700), ble ak vèt ki flote dousman.
// Blob yo se radial-gradient (pa filter blur): li lejè pou telefòn ki pa gen anpil memwa.

// Paj ki gen fon an (n ap ajoute lòt yo apre)
const PAGES = new Set(["/"]);

type Blob = { top: string; left: string; size: string; color: string; dur: number; delay: number; dx: string; dy: string };

const BLOBS: Blob[] = [
  // Tèt paj la: limyè jòn anlè adwat + ble agoch
  { top: "-6%", left: "62%", size: "46rem", color: "rgba(255,215,0,0.13)", dur: 20, delay: 0, dx: "-14%", dy: "10%" },
  { top: "2%", left: "-18%", size: "42rem", color: "rgba(56,110,255,0.20)", dur: 24, delay: -8, dx: "16%", dy: "12%" },
  // Mitan: vèt adwat, ble agoch
  { top: "28%", left: "55%", size: "48rem", color: "rgba(16,185,129,0.15)", dur: 26, delay: -4, dx: "-15%", dy: "-10%" },
  { top: "46%", left: "-20%", size: "44rem", color: "rgba(59,130,246,0.15)", dur: 22, delay: -12, dx: "16%", dy: "-8%" },
  // Ti limyè jòn nan mitan pou l pa twò fonse
  { top: "62%", left: "40%", size: "30rem", color: "rgba(255,215,0,0.08)", dur: 18, delay: -6, dx: "-18%", dy: "14%" },
  // Anba: vèt fonse ki plen
  { top: "76%", left: "-10%", size: "52rem", color: "rgba(10,92,54,0.45)", dur: 28, delay: -16, dx: "12%", dy: "-10%" },
  { top: "86%", left: "50%", size: "46rem", color: "rgba(34,197,94,0.14)", dur: 24, delay: -10, dx: "-14%", dy: "-9%" },
];

export function AmbientBackground() {
  const pathname = usePathname();
  if (!PAGES.has(pathname)) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Degradasyon prensipal la: tout longè paj la */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0B132B 0%, #0B132B 12%, #0C1B36 30%, #0B2A3B 50%, #0A3D39 68%, #0A5C36 88%, #08472B 100%)",
        }}
      />

      {/* Blob limyè ki flote dousman */}
      {BLOBS.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full will-change-transform motion-safe:animate-blob-drift"
          style={
            {
              top: b.top,
              left: b.left,
              width: b.size,
              height: b.size,
              background: `radial-gradient(circle at center, ${b.color} 0%, transparent 68%)`,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
              "--dx": b.dx,
              "--dy": b.dy,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Fòm jeyometrik fen: sèk limyè ak yon reyon dyagonal, pou bay pwofondè */}
      <span className="absolute left-[70%] top-[9%] h-[28rem] w-[28rem] rounded-full border border-white/[0.06]" />
      <span className="absolute left-[74%] top-[13%] h-[20rem] w-[20rem] rounded-full border border-citron-300/[0.07]" />
      <span className="absolute left-[-12%] top-[52%] h-[34rem] w-[34rem] rounded-full border border-emerald-300/[0.06]" />
      <span
        className="absolute left-[-10%] top-[18%] h-[60rem] w-[38rem] -rotate-[25deg] opacity-60"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)" }}
      />

      {/* Ti grenn fen (tankou papye) pou koulè yo fonn san bann */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
