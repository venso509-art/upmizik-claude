"use client";

import { usePathname } from "next/navigation";
import { GradientWaves } from "@/components/GradientWaves";

// Fon "premium" ki kouvri TOUT longè paj la (header → footer), tankou yon sèl gwo degradasyon fluid.
//  - Mòd sonb: Nwa Ble (#0B132B) anlè → Vèt Fonse (#0A5C36) anba, ak gwo limyè ki klere (jòn, ble, vèt),
//    yon ban "awora" ak ti zetwal k ap klere.
//  - Mòd light: fon blan, ak limyè pastèl trè dous.
// Blob yo se radial-gradient (pa filter blur): li lejè pou telefòn ki pa gen anpil memwa.

// Paj ki gen fon an (limyè + zetwal sou tout longè paj la)
const PAGES = new Set(["/", "/atis", "/sosyal"]);
// Paj ki gen vag GradientWaves yo anlè (Akèy deja genyen yo nan Hero a)
const WAVES_PAGES = new Set(["/atis", "/sosyal"]);

type Blob = { top: string; left: string; size: string; color: string; dur: number; delay: number; dx: string; dy: string };

const DARK_BLOBS: Blob[] = [
  // Tèt paj la: gwo limyè jòn anlè adwat (tankou yon pwojektè) + ble klere agoch
  { top: "-8%", left: "55%", size: "50rem", color: "rgba(255,215,0,0.30)", dur: 20, delay: 0, dx: "-14%", dy: "10%" },
  { top: "0%", left: "-18%", size: "46rem", color: "rgba(59,130,246,0.38)", dur: 24, delay: -8, dx: "16%", dy: "12%" },
  // Mitan: vèt limyè adwat, ble agoch, jòn nan mitan
  { top: "24%", left: "52%", size: "50rem", color: "rgba(16,185,129,0.32)", dur: 26, delay: -4, dx: "-15%", dy: "-10%" },
  { top: "42%", left: "-22%", size: "46rem", color: "rgba(56,189,248,0.26)", dur: 22, delay: -12, dx: "16%", dy: "-8%" },
  { top: "58%", left: "35%", size: "34rem", color: "rgba(255,215,0,0.20)", dur: 18, delay: -6, dx: "-18%", dy: "14%" },
  // Anba: vèt fonse plen + vèt klere
  { top: "74%", left: "-12%", size: "54rem", color: "rgba(10,92,54,0.65)", dur: 28, delay: -16, dx: "12%", dy: "-10%" },
  { top: "84%", left: "48%", size: "48rem", color: "rgba(34,197,94,0.30)", dur: 24, delay: -10, dx: "-14%", dy: "-9%" },
];

const LIGHT_BLOBS: Blob[] = [
  { top: "-8%", left: "55%", size: "50rem", color: "rgba(255,215,0,0.22)", dur: 20, delay: 0, dx: "-14%", dy: "10%" },
  { top: "4%", left: "-18%", size: "46rem", color: "rgba(59,130,246,0.12)", dur: 24, delay: -8, dx: "16%", dy: "12%" },
  { top: "30%", left: "52%", size: "50rem", color: "rgba(16,185,129,0.14)", dur: 26, delay: -4, dx: "-15%", dy: "-10%" },
  { top: "58%", left: "-15%", size: "40rem", color: "rgba(255,215,0,0.14)", dur: 18, delay: -6, dx: "18%", dy: "14%" },
  { top: "80%", left: "45%", size: "48rem", color: "rgba(10,92,54,0.12)", dur: 24, delay: -10, dx: "-14%", dy: "-9%" },
];

// Ti zetwal ki klere (pozisyon fiks pou paj la pa chanje chak fwa)
const STARS = Array.from({ length: 26 }, (_, i) => ({
  top: `${(i * 37 + 7) % 100}%`,
  left: `${(i * 61 + 13) % 100}%`,
  size: 2 + (i % 3),
  gold: i % 4 === 0,
  dur: 2.6 + (i % 5) * 0.7,
  delay: -(i % 7) * 0.6,
}));

function Blobs({ list }: { list: Blob[] }) {
  return (
    <>
      {list.map((b, i) => (
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
    </>
  );
}

export function AmbientBackground() {
  const pathname = usePathname();
  if (!PAGES.has(pathname)) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* ===== MÒD SONB ===== */}
      <div className="amb-dark absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #0B132B 0%, #0D1838 14%, #0C2342 32%, #0A3242 50%, #0A4239 68%, #0A5C36 86%, #08472B 100%)",
          }}
        />
        <Blobs list={DARK_BLOBS} />

        {/* Ban "awora": yon riban limyè vèt → ble → jòn ki travèse paj la an dyagonal */}
        <span
          className="absolute left-[-30%] top-[10%] h-[34rem] w-[160%] -rotate-[12deg] opacity-70 motion-safe:animate-blob-drift"
          style={
            {
              background:
                "radial-gradient(ellipse 50% 40% at 30% 50%, rgba(16,185,129,0.28), transparent 70%), radial-gradient(ellipse 45% 35% at 60% 45%, rgba(56,189,248,0.22), transparent 70%), radial-gradient(ellipse 35% 30% at 85% 55%, rgba(255,215,0,0.18), transparent 70%)",
              animationDuration: "30s",
              "--dx": "6%",
              "--dy": "8%",
            } as React.CSSProperties
          }
        />
        <span
          className="absolute left-[-30%] top-[55%] h-[30rem] w-[160%] rotate-[10deg] opacity-60 motion-safe:animate-blob-drift"
          style={
            {
              background:
                "radial-gradient(ellipse 45% 40% at 25% 50%, rgba(255,215,0,0.16), transparent 70%), radial-gradient(ellipse 50% 40% at 70% 50%, rgba(16,185,129,0.26), transparent 70%)",
              animationDuration: "34s",
              animationDelay: "-12s",
              "--dx": "-6%",
              "--dy": "-6%",
            } as React.CSSProperties
          }
        />

        {/* Fòm jeyometrik: sèk limyè */}
        <span className="absolute left-[68%] top-[7%] h-[28rem] w-[28rem] rounded-full border border-white/[0.08]" />
        <span className="absolute left-[72%] top-[11%] h-[20rem] w-[20rem] rounded-full border border-citron-300/[0.12]" />
        <span className="absolute left-[-12%] top-[50%] h-[34rem] w-[34rem] rounded-full border border-emerald-300/[0.09]" />

        {/* Ti zetwal k ap klere */}
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full motion-safe:animate-twinkle"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              background: s.gold ? "#FFE34D" : "#FFFFFF",
              boxShadow: `0 0 ${s.size * 4}px ${s.gold ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.8)"}`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ===== VAG YO ANLÈ PAJ LA (Atis, Sosyal): fonn dousman nan rès fon an ===== */}
      {WAVES_PAGES.has(pathname) && (
        <GradientWaves
          waveColor={["#0A5C36", "#0B132B", "#1E3A8A", "#FFD700"]}
          amplitude={0.3}
          swell={0.6}
          lightAngle={45}
          speed={0.5}
          className="amb-waves absolute inset-x-0 top-0 h-[30rem] opacity-80 [mask-image:linear-gradient(to_bottom,black_45%,transparent)] sm:h-[34rem]"
        />
      )}

      {/* ===== MÒD LIGHT: blan, ak limyè pastèl ===== */}
      <div className="amb-light absolute inset-0">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 40%, #F6FBF8 75%, #EEF7F1 100%)" }} />
        <Blobs list={LIGHT_BLOBS} />
      </div>

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
