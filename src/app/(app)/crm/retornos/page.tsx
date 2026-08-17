import { PaginaVoos } from "@/components/crm/pagina-voos";

export const metadata = { title: "FlyTop OS · Retornos 48h" };

export const dynamic = "force-dynamic";

export default function RetornosPage() {
  return <PaginaVoos tipo="retornos" />;
}
