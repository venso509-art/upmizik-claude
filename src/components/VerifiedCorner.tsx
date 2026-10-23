import { VerifiedBadge } from "@/components/VerifiedBadge";

// Tchèk ble a sou kwen anba a dwat foto pwofil yon atis sètifye.
// Paran an dwe gen "relative" (epi pa "overflow-hidden", sinon tchèk la koupe).
export function VerifiedCorner({
  show,
  size = "sm",
  position = "-bottom-0.5 -right-0.5",
}: {
  show?: boolean | null;
  size?: "sm" | "md" | "lg" | "xl";
  position?: string; // pou gwo sèk yo, rale l pi pre won an
}) {
  if (!show) return null;
  return (
    <span className={`pointer-events-none absolute ${position} z-10 flex rounded-full bg-zinc-950 p-[2px]`}>
      <VerifiedBadge size={size} className="!ml-0" />
    </span>
  );
}
