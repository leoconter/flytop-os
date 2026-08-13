import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertBuilder } from "@/components/alertas/alert-builder";
import { PageHead } from "@/components/dashboard/ui";
import { buscarAlerta } from "@/lib/alertas/store";

export const metadata = {
  title: "FlyTop OS · Novo alerta",
};

export const dynamic = "force-dynamic";

/**
 * Cadastro em tela própria.
 *
 * O formulário e a pré-visualização ocupam a largura toda; misturados com o
 * banco de alertas, viravam uma tela só de informação e nenhuma das duas
 * coisas ficava confortável.
 */
export default async function NovoAlertaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const alerta = id ? await buscarAlerta(id) : null;
  if (id && !alerta) notFound();

  return (
    <>
      <PageHead
        eyebrow="Alertas"
        title={alerta ? "Editar alerta" : "Novo alerta"}
        sub="Fica guardado no banco de alertas; o envio aos grupos é feito por você"
        right={
          <Link href="/alertas" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para alertas
          </Link>
        }
      />

      <AlertBuilder
        id={alerta?.id}
        inicial={alerta?.fields}
        mensagemInicial={alerta?.mensagem}
      />
    </>
  );
}
