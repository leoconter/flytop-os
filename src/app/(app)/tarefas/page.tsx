import Link from "next/link";
import { ListaTarefas } from "@/components/tarefas/lista";
import { Quadro } from "@/components/tarefas/quadro";
import { Metrics, PageHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { listUsers } from "@/lib/auth/users";
import { fmtInt } from "@/lib/meta/instagram";
import {
  comoModalidade,
  comoPrioridade,
  MODALIDADE_LABEL,
  MODALIDADES,
  PRIORIDADE_LABEL,
  PRIORIDADES,
} from "@/lib/tarefas/modelo";
import { listarTarefas } from "@/lib/tarefas/store";
import { Filtros } from "./filtros";

export const metadata = { title: "FlyTop OS · Tarefas" };

/** Muda a cada arrasto e a cada comentário: nada de cache. */
export const dynamic = "force-dynamic";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{
    v?: string;
    quem?: string;
    mod?: string;
    prio?: string;
    q?: string;
    fim?: string;
  }>;
}) {
  const p = await searchParams;
  const kanban = p.v !== "lista";
  const concluidas = p.fim === "1";

  const [listagem, usuarios] = await Promise.all([
    listarTarefas({
      responsavel: p.quem || null,
      modalidade: p.mod ? comoModalidade(p.mod) : null,
      prioridade: p.prio ? comoPrioridade(p.prio) : null,
      busca: p.q || null,
      // O quadro tem a coluna "Concluído": esconder o que já terminou deixaria
      // uma coluna sempre vazia. Na lista, só quando se pede.
      incluirConcluidas: kanban || concluidas,
    }),
    listUsers(),
  ]);

  const tarefas = "tarefas" in listagem ? listagem.tarefas : null;
  const ativos = (usuarios ?? []).filter((u) => u.active);

  const conta = (e: string) => (tarefas ?? []).filter((t) => t.status === e).length;
  const metrics: Metric[] = [
    { label: "A fazer", value: fmtInt(conta("a_fazer")), hint: "esperando alguém" },
    { label: "Em andamento", value: fmtInt(conta("em_andamento")), tone: "blue", hint: "sendo tocadas" },
    { label: "Aguardando", value: fmtInt(conta("aguardando")), hint: "paradas por terceiros" },
    {
      label: "Urgentes em aberto",
      value: fmtInt(
        (tarefas ?? []).filter((t) => t.priority === "urgente" && t.status !== "concluido").length,
      ),
      tone: "red",
      hint: "prioridade urgente",
    },
  ];

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v && k !== "v") params.set(k, v);
  const comVisao = (visao: string) => {
    const q = new URLSearchParams(params);
    if (visao === "lista") q.set("v", "lista");
    const s = q.toString();
    return `/tarefas${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHead
        eyebrow="Operação"
        title="Tarefas"
        sub="O que a equipe precisa fazer, em lista ou no quadro"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="seg">
              <Link href={comVisao("kanban")} className={kanban ? "on" : undefined}>
                Quadro
              </Link>
              <Link href={comVisao("lista")} className={!kanban ? "on" : undefined}>
                Lista
              </Link>
            </span>
            <Link href="/tarefas/nova" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nova tarefa
            </Link>
          </div>
        }
      />

      <Metrics metrics={metrics} />

      <Filtros
        pessoas={ativos.map((u) => ({ userId: u.userId, fullName: u.fullName }))}
        modalidades={MODALIDADES.map((m) => ({ valor: m, rotulo: MODALIDADE_LABEL[m] }))}
        prioridades={PRIORIDADES.map((x) => ({ valor: x, rotulo: PRIORIDADE_LABEL[x] }))}
        mostrarConcluidas={!kanban}
      />

      {!tarefas ? (
        <div className="glass card">
          <p className="wa-empty" style={{ padding: "28px 10px" }}>
            {"erro" in listagem && listagem.erro === "sem-tabela"
              ? "As tabelas de tarefas ainda não foram criadas no banco."
              : "O banco de tarefas não respondeu."}
          </p>
        </div>
      ) : kanban ? (
        <Quadro tarefas={tarefas} />
      ) : (
        <ListaTarefas tarefas={tarefas} />
      )}
    </>
  );
}
