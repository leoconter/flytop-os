import Link from "next/link";
import { PageHead, SectionHead } from "@/components/dashboard/ui";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { CamposTarefa } from "@/components/tarefas/campos";
import { listUsers } from "@/lib/auth/users";
import { criarTarefa } from "../actions";

export const metadata = { title: "FlyTop OS · Nova tarefa" };
export const dynamic = "force-dynamic";

/**
 * Cadastro em tela própria, como o do alerta: com descrição e checklist, o
 * formulário não cabe confortavelmente ao lado do quadro.
 */
export default async function NovaTarefaPage() {
  const usuarios = (await listUsers()) ?? [];
  const ativos = usuarios.filter((u) => u.active);

  return (
    <>
      <PageHead
        eyebrow="Tarefas"
        title="Nova tarefa"
        sub="Nasce em A Fazer; o checklist e os anexos entram depois de criada"
        right={
          <Link href="/tarefas" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para tarefas
          </Link>
        }
      />

      <div className="section">
        <div className="glass card tk-form">
          <SectionHead title="Dados da tarefa" sub="o título é o único obrigatório" flush />
          <FormAcao action={criarTarefa} className="form-grid" style={{ marginTop: 14 }}>
            <input type="hidden" name="status" value="a_fazer" />
            <CamposTarefa
              pessoas={ativos.map((u) => ({ userId: u.userId, fullName: u.fullName }))}
            />
            <div className="field full acoes-edicao">
              <BotaoAcao enviando="Criando…">Criar tarefa</BotaoAcao>
              <Link href="/tarefas" className="btn btn-ghost">
                Cancelar
              </Link>
            </div>
          </FormAcao>
        </div>
      </div>
    </>
  );
}
