import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHead, SectionHead } from "@/components/dashboard/ui";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { currentUser } from "@/lib/auth/session";
import { salvarPreferencias } from "./preferencias";

export const metadata = { title: "FlyTop OS · Minha conta" };

/** Tela de configuração não pode ser prerenderizada: mostraria estado velho. */
export const dynamic = "force-dynamic";

/** Um dado da conta, exibido como texto — não é campo de edição. */
function Dado({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="readonly-field neutro">{valor}</div>
    </div>
  );
}

export default async function MinhaContaPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const admin = user.role === "admin";

  return (
    <>
      <PageHead
        title="Minha conta"
        sub="Seus dados na plataforma e como você quer ser avisado"
      />

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Dados da conta"
            sub="quem cadastra e altera é um administrador"
            flush
            right={
              admin ? (
                <Link href="/configuracoes/usuarios" className="btn btn-ghost btn-sm">
                  Editar em Usuários
                </Link>
              ) : undefined
            }
          />
          <div className="form-grid" style={{ marginTop: 14 }}>
            <Dado label="Nome" valor={user.fullName} />
            <Dado label="E-mail" valor={user.email} />
            <Dado label="Papel" valor={admin ? "Administrador" : "Vendedor"} />
            <Dado
              label="Equipe"
              valor={user.teamName ?? <span className="muted">sem equipe</span>}
            />
          </div>
          {!admin && (
            <p className="metric-hint" style={{ marginTop: 12 }}>
              Para corrigir nome, e-mail ou trocar a senha, peça a um
              administrador.
            </p>
          )}
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Avisos na tela"
            sub="valem em qualquer navegador em que você entrar"
            flush
          />
          <FormAcao action={salvarPreferencias} exigeMudanca style={{ marginTop: 14 }}>
            <label className="opcao">
              <input
                type="checkbox"
                name="alertFlyby"
                defaultChecked={user.alertFlyby}
              />
              <span>
                <b>Aviso de alerta enviado</b>
                <span className="opcao-sub">
                  Um aviãozinho atravessa a tela com um som curto quando alguém
                  marca um alerta como enviado aos grupos.
                </span>
              </span>
            </label>
            <div style={{ marginTop: 14 }}>
              <BotaoAcao>Salvar</BotaoAcao>
            </div>
          </FormAcao>
          <p className="metric-hint" style={{ marginTop: 12 }}>
            Para tirar só o som e manter o aviãozinho, use o ícone de som na
            própria faixa quando ela passar — isso vale só neste navegador.
          </p>
        </div>
      </div>
    </>
  );
}
