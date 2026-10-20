/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vèsyon konpak pou Docker/Coolify: sèlman fichye sit la bezwen pou l kouri
  output: "standalone",
  experimental: {
    // Enskripsyon atis la voye foto prèv peman an (jiska 5 MB) atravè yon Server Action
    serverActions: { bodySizeLimit: "6mb" },
  },
  eslint: {
    // Nou tcheke kòd la ak "npm run lint" sou òdinatè a; pa refè l pandan build Docker la
    // (sa evite pwoblèm ak modil natif ESLint sou Linux)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
