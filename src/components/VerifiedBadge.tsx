// Badj "kont verifye" UpMizik: yon sele ble ak kwen won ak yon ✓ blan, tankou sou gwo rezo sosyal yo.
// Ekip UpMizik la sèlman ki ka bay li (Admin → 💼 Kont atis / 🛡️ Apèsi).
const SEAL =
  "M12 1.5l2.39 1.75 2.95-.2 1.03 2.77 2.53 1.53-.65 2.89L21.5 12l-1.25 2.76.65 2.89-2.53 1.53-1.03 2.77-2.95-.2L12 22.5l-2.39-1.75-2.95.2-1.03-2.77-2.53-1.53.65-2.89L2.5 12l1.25-2.76-.65-2.89 2.53-1.53 1.03-2.77 2.95.2L12 1.5Z";

const SIZES = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7", xl: "h-9 w-9" } as const;

export function VerifiedBadge({ size = "sm", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      className={`ml-1 inline-flex shrink-0 align-[-0.15em] ${className}`}
      title="Kont verifye pa UpMizik"
      aria-label="Kont verifye"
      role="img"
    >
      <svg viewBox="0 0 24 24" className={`${SIZES[size]} drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]`} aria-hidden>
        <path d={SEAL} fill="#1D9BF0" />
        <path d="M7.6 12.3l2.9 2.9 5.9-6.2" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
