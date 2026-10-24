import type { OverlayItem } from "@/lib/statuses";

// Montre stickers ak lejand yo sou foto/videyo a (menm kalkil nan editè a ak nan ekran stati a).
// Paran an dwe "relative" e li dwe gen fòma 9:16. Gwosè yo an % lajè kad la (cqw).
export function OverlayItemView({ item, selected = false }: { item: OverlayItem; selected?: boolean }) {
  return (
    <span
      className={`absolute -translate-x-1/2 -translate-y-1/2 select-none whitespace-pre-wrap text-center leading-tight ${
        selected ? "outline outline-2 outline-offset-4 outline-citron-400" : ""
      }`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        fontSize: `${item.s}cqw`,
        ...(item.t === "text"
          ? {
              color: item.c ?? "#FFFFFF",
              fontWeight: 800,
              maxWidth: "90cqw",
              padding: "0.15em 0.45em",
              borderRadius: "0.4em",
              background: item.c === "#0B132B" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.45)",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }
          : { filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }),
      }}
    >
      {item.v}
    </span>
  );
}

export function StatusOverlayLayer({ items }: { items: OverlayItem[] }) {
  if (!items.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {items.map((it, i) => (
        <OverlayItemView key={i} item={it} />
      ))}
    </div>
  );
}
