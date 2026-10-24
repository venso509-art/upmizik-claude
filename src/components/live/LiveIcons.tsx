// Ikòn salkèl live la (liy pwòp, menm stil toupatou), olye emoji
type P = { className?: string };
const base = (className = "h-6 w-6") => ({
  viewBox: "0 0 24 24",
  className,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const MicIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10a7 7 0 0 1-14 0" />
    <path d="M12 17v5" />
  </svg>
);
export const MicOffIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <path d="M19 10a7 7 0 0 1-.78 3.2M16.95 16.95A7 7 0 0 1 5 10" />
    <path d="M12 17v5" />
    <path d="m2 2 20 20" />
  </svg>
);
export const CamIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.94a.5.5 0 0 0-.78-.42L16 11" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </svg>
);
export const CamOffIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.25-3.5a.5.5 0 0 1 .75.42v9.16" />
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
    <path d="m2 2 20 20" />
  </svg>
);
export const FlipIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M20 10a8 8 0 0 0-14.9-3" />
    <path d="M4 3v4h4" />
    <path d="M4 14a8 8 0 0 0 14.9 3" />
    <path d="M20 21v-4h-4" />
  </svg>
);
export const HeartIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} fill="currentColor" aria-hidden>
    <path d="M12 21.35 10.55 20C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.54Z" />
  </svg>
);
export const GiftIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
  </svg>
);
export const HandIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M18 11V6a2 2 0 0 0-4 0v5" />
    <path d="M14 10V4a2 2 0 0 0-4 0v6" />
    <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);
export const ShareIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M15 14l5-5-5-5" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
export const EyeIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const SendIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4Z" />
  </svg>
);
export const UsersIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
export const PowerIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 2v10" />
    <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
  </svg>
);
export const MoreIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} fill="currentColor" aria-hidden>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);
export const UserPlusIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6" />
    <path d="M22 11h-6" />
  </svg>
);
