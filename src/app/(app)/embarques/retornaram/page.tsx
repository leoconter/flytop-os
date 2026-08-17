import { PaginaVoos } from "@/components/embarques/pagina-voos";

export const metadata = { title: "FlyTop OS · Já retornaram" };

export const dynamic = "force-dynamic";

export default function RetornaramPage() {
  return <PaginaVoos tipo="retornaram" />;
}
