import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // A "Dashboard Geral" passou a ser a raiz (/). Mantém links antigos vivos.
      { source: "/dashboard", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
