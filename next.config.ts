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
      // Embarques saiu de dentro do CRM e virou item próprio de Operação.
      { source: "/crm/embarques", destination: "/embarques", permanent: false },
      { source: "/crm/retornos", destination: "/embarques/retornos", permanent: false },
      { source: "/crm/retornaram", destination: "/embarques/retornaram", permanent: false },
    ];
  },
};

export default nextConfig;
