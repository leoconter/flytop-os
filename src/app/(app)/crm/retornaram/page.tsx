import { PaginaVoos } from "@/components/crm/pagina-voos";

export const metadata = { title: "FlyTop OS · Já retornaram" };

export const dynamic = "force-dynamic";

export default function RetornaramPage() {
  return <PaginaVoos tipo="retornaram" />;
}
