// Disk vinil ki woule pandan mizik la ap jwe: siyon nwa ki briye, poster chante a nan mitan an (etikèt la)
export function VinylDisc({
  coverUrl,
  spinning,
  className = "h-12 w-12",
  labelRatio = 0.5,
}: {
  coverUrl: string | null;
  spinning: boolean;
  className?: string;
  labelRatio?: number; // gwosè poster la konpare ak disk la
}) {
  const inset = `${((1 - labelRatio) / 2) * 100}%`;
  return (
    <span className={`relative block shrink-0 rounded-full shadow-[0_8px_24px_-6px_rgba(0,0,0,0.8)] ${className}`} aria-hidden>
      {/* Pati ki woule a: siyon yo + poster la */}
      <span
        className="absolute inset-0 rounded-full motion-safe:animate-vinyl"
        style={{
          animationPlayState: spinning ? "running" : "paused",
          background: "repeating-radial-gradient(circle at 50% 50%, #0d0d0f 0 1.1px, #1d1d22 1.1px 2.3px)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        <span className="absolute overflow-hidden rounded-full ring-2 ring-black/70" style={{ inset }}>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-600 to-violet-800" />
          )}
        </span>
        {/* Ti twou nan mitan an */}
        <span className="absolute left-1/2 top-1/2 h-[7%] w-[7%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 ring-1 ring-white/40" />
      </span>
      {/* Reflè limyè ki rete fiks (li pa woule): se li ki bay efè vinil k ap vire a */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 200deg, transparent 0 18%, rgba(255,255,255,0.16) 26%, transparent 34% 68%, rgba(255,255,255,0.12) 76%, transparent 84%)",
          WebkitMaskImage: `radial-gradient(circle, transparent ${labelRatio * 50}%, #000 ${labelRatio * 50 + 1}%)`,
          maskImage: `radial-gradient(circle, transparent ${labelRatio * 50}%, #000 ${labelRatio * 50 + 1}%)`,
        }}
      />
    </span>
  );
}
