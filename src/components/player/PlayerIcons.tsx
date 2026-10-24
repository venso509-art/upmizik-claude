// Ikòn lektè a, byen desinen (pa emoji): sou telefòn yo pa vin ti kare koulè ankò
export function PlayIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function PauseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="4.5" width="4" height="15" rx="1.4" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.4" />
    </svg>
  );
}

export function PrevIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="4.5" y="5" width="2.6" height="14" rx="1.2" />
      <path d="M19.5 6.08v11.84a1 1 0 0 1-1.55.83l-8.9-5.92a1 1 0 0 1 0-1.66l8.9-5.92a1 1 0 0 1 1.55.83Z" />
    </svg>
  );
}

export function NextIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="16.9" y="5" width="2.6" height="14" rx="1.2" />
      <path d="M4.5 6.08v11.84a1 1 0 0 0 1.55.83l8.9-5.92a1 1 0 0 0 0-1.66l-8.9-5.92a1 1 0 0 0-1.55.83Z" />
    </svg>
  );
}

// Flèch won ak "10" anndan l: rekile (back) oswa avanse 10 segonn
export function Skip10Icon({ direction, className = "h-6 w-6" }: { direction: "back" | "forward"; className?: string }) {
  const back = direction === "back";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform={back ? undefined : "translate(24 0) scale(-1 1)"}>
        <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
        <path d="M4.2 3.6v3.6h3.6" />
      </g>
      <text x="12.2" y="15.4" textAnchor="middle" fontSize="7.4" fontWeight="800" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">
        10
      </text>
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
