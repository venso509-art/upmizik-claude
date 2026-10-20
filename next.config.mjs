/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enskripsyon atis la voye foto prèv peman an (jiska 5 MB) atravè yon Server Action
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
