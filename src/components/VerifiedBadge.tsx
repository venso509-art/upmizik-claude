// Ti ✓ ble bò kote non yon atis ekip UpMizik la verifye
export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-7 w-7 text-sm" : "h-4 w-4 text-[10px]";
  return (
    <span
      className={`ml-1 inline-flex shrink-0 items-center justify-center rounded-full bg-sky-500 align-middle font-black text-white ${dim}`}
      title="Atis verifye pa UpMizik"
      aria-label="Verifye"
    >
      ✓
    </span>
  );
}
