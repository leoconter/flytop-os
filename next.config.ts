import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // A "Dashboard Geral" passou a ser a raiz (/). Mantém links antigos vivos.
      { source: "/dashboard", destination: "/", permanent: false },
      // A Jornada de Compra saiu do menu e virou sub-tela do Controle Interno.
      // 307 e não 308: o navegador guarda o 308 para sempre, e a organização do
      // menu ainda pode mudar.
      { source: "/jornada", destination: "/interno/jornada", permanent: false },
    ];
  },
};

export default nextConfig;
