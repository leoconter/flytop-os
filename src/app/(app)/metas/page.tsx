import Link from "next/link";
import { PageHead, Pill } from "@/components/dashboard/ui";
import { getGoalsYear } from "@/lib/monde/goals";
import { MetasTabs } from "@/components/metas/tabs";
import { GoalsGrid } from "./goals-grid";

export const metadata = { title: "FlyTop OS · Metas de Venda" };

/** Cadastro: nunca pode servir uma versão prerenderizada no build. */
export const dynamic = "force-dynamic";

/** Ano corrente em São Paulo. */
function anoCorrente(): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(new Date()),
  );
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  // A tela é anual e tem navegação própria — não usa o período do cabeçalho.
  const pedido = Number((await searchParams).ano);
  const year =
    Number.isInteger(pedido) && pedido >= 2000 && pedido <= 2100 ? pedido : anoCorrente();

  const data = await getGoalsYear(year);

  if (!data) {
    return (
      <>
        <PageHead
          title="Metas de Venda"
          sub="Planilha anual de metas por vendedor"
          right={<Pill tone="blue">Aguardando conexão</Pill>}
        />
        <MetasTabs />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            O banco ainda não respondeu. Confira as credenciais do Supabase.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Metas de Venda"
        sub="Meta de faturamento da agência e de cada vendedor, mês a mês"
        right={
          <span className="year-nav">
            <Link className="btn btn-ghost btn-sm" href={`/metas?ano=${year - 1}`} aria-label="Ano anterior">
              ‹
            </Link>
            <b>{year}</b>
            <Link className="btn btn-ghost btn-sm" href={`/metas?ano=${year + 1}`} aria-label="Próximo ano">
              ›
            </Link>
          </span>
        }
      />

      <MetasTabs />

      <div className="section">
        <GoalsGrid data={data} />
      </div>
    </>
  );
}
