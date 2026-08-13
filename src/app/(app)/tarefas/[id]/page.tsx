import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHead, SectionHead } from "@/components/dashboard/ui";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { AnexosTarefa } from "@/components/tarefas/anexos-tarefa";
import { Atividade } from "@/components/tarefas/atividade";
import { CamposTarefa } from "@/components/tarefas/campos";
import { Checklist } from "@/components/tarefas/checklist";
import { Etiqueta } from "@/components/tarefas/etiquetas";
import { ExcluirTarefa } from "@/components/tarefas/excluir";
import { currentUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/auth/users";
import { buscarTarefa, detalhesTarefa } from "@/lib/tarefas/store";
import { editarTarefa } from "../actions";

export const dynamic = "force-dynamic";

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await buscarTarefa((await params).id);
  return { title: t ? `FlyTop OS · #${t.seq} ${t.title}` : "FlyTop OS · Tarefa" };
}

export default async function TarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [tarefa, detalhes, usuarios] = await Promise.all([
    buscarTarefa(id),
    detalhesTarefa(id),
    listUsers(),
  ]);
  if (!tarefa || !detalhes) notFound();

  // Quem já é responsável continua na lista mesmo se a conta for desativada,
  // senão salvar a tarefa apagaria o vínculo sem ninguém pedir.
  const pessoas = (usuarios ?? [])
    .filter((u) => u.active || u.userId === tarefa.assigneeId)
    .map((u) => ({ userId: u.userId, fullName: u.fullName }));

  return (
    <>
      <PageHead
        eyebrow={`Tarefa #${tarefa.seq}`}
        title={tarefa.title}
        sub={
          <>
            Criada por {tarefa.createdByName ?? "alguém"} em{" "}
            {quando.format(new Date(tarefa.createdAt))}
            {tarefa.completedAt && ` · concluída em ${quando.format(new Date(tarefa.completedAt))}`}
          </>
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Etiqueta etapa={tarefa.status} />
            <Link href="/tarefas" className="chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar para tarefas
            </Link>
          </div>
        }
      />

      <div className="tk-detalhe">
        <div className="tk-coluna-principal">
          <div className="glass card tk-form">
            <SectionHead title="Dados da tarefa" sub="salvar registra no histórico" flush />
            {/* A `key` carrega os valores gravados: os campos são não
                controlados (`defaultValue`), então sem remontar eles ficariam
                mostrando o que estava na tela antes de salvar — e o select de
                etapa continuaria em "A Fazer" com a tarefa já em andamento. */}
            <FormAcao
              key={[
                tarefa.updatedAt,
                tarefa.status,
                tarefa.priority,
                tarefa.modality,
                tarefa.assigneeId ?? "",
              ].join("|")}
              action={editarTarefa}
              exigeMudanca
              className="form-grid"
              style={{ marginTop: 14 }}
            >
              <input type="hidden" name="id" value={tarefa.id} />
              <CamposTarefa
                pessoas={pessoas}
                mostrarEtapa
                valores={{
                  title: tarefa.title,
                  description: tarefa.description,
                  locator: tarefa.locator,
                  modality: tarefa.modality,
                  priority: tarefa.priority,
                  status: tarefa.status,
                  assigneeId: tarefa.assigneeId,
                }}
              />
              <div className="field full acoes-edicao">
                <BotaoAcao>Salvar</BotaoAcao>
              </div>
            </FormAcao>

            {/* Fora do formulário acima: um <form> dentro de outro é HTML
                inválido, e o navegador desmonta o de dentro. */}
            <div className="tk-perigo">
              <ExcluirTarefa id={tarefa.id} />
            </div>
          </div>

          <Checklist taskId={tarefa.id} itens={detalhes.checklist} />
          <AnexosTarefa taskId={tarefa.id} anexos={detalhes.anexos} />
        </div>

        <Atividade
          taskId={tarefa.id}
          comentarios={detalhes.comentarios}
          eventos={detalhes.eventos}
          meuId={user.userId}
          souAdmin={user.role === "admin"}
        />
      </div>
    </>
  );
}
