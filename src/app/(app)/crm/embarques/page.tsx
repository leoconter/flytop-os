import { PaginaVoos } from "@/components/crm/pagina-voos";

export const metadata = { title: "FlyTop OS · Embarques 48h" };

// A janela é de horas: cachear serviria uma lista velha, e "em 2h" que já
// passou é pior que dado nenhum.
export const dynamic = "force-dynamic";

export default function EmbarquesPage() {
  return <PaginaVoos tipo="embarques" />;
}
