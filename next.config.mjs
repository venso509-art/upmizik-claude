// ===== HEADER SEKIRITE (tout paj sit la) =====
// - HSTS: navigatè a toujou itilize HTTPS (pa gen "includeSubDomains": lòt sous-domèn yo pa afekte)
// - CSP: sit la ka chaje kòd sèlman depi pwòp domèn li; pa gen plugin, pa gen <base>, fòm yo voye sèlman sou sit la,
//   epi lòt sit pa ka mete UpMizik andedan yon iframe (clickjacking)
// - nosniff, Referrer-Policy, Permissions-Policy: kamera/mikwo sèlman pou UpMizik li menm (live yo)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Supabase (API + an dirèk), LiveKit (videyo live yo)
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vèsyon konpak pou Docker/Coolify: sèlman fichye sit la bezwen pou l kouri
  output: "standalone",
  // Pa di pirat yo ki teknoloji sit la itilize
  poweredByHeader: false,
  experimental: {
    // Enskripsyon atis la voye foto prèv peman an (jiska 5 MB) atravè yon Server Action
    serverActions: { bodySizeLimit: "6mb" },
  },
  eslint: {
    // Nou tcheke kòd la ak "npm run lint" sou òdinatè a; pa refè l pandan build Docker la
    // (sa evite pwoblèm ak modil natif ESLint sou Linux)
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
