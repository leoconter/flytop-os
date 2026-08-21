import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Orbs } from "@/components/orbs";
import { AvisoVoo } from "@/components/alertas/aviso-voo";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { statusMfa } from "@/lib/auth/mfa";
import { currentUser } from "@/lib/auth/session";
import { getUltimaSync } from "@/lib/monde/sync-status";

/**
 * A checagem que vale.
 *
 * O `proxy.ts` só olha se existe cookie — é um filtro barato, que roda até em
 * rota pré-carregada. Aqui a sessão é validada no Supabase e o perfil é lido do
 * banco, antes de qualquer tela desenhar. Cookie inventado não passa daqui.
 */
/**
 * A atualização completa relê as 47 páginas do histórico. Medido: 58s a função
 * sozinha, 145s de ponta a ponta em produção (a revalidação das telas entra na
 * conta). 300s é o teto do plano — margem, não estimativa otimista.
 */
export const maxDuration = 300;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  /* Segundo fator obrigatório. Senha correta deixa a sessão em `aal1`; só o
     código do autenticador a leva a `aal2`. Quem ainda não cadastrou vai para
     o cadastro — não há como adiar, que é o ponto de ser obrigatório. */
  const mfa = await statusMfa();
  if (mfa && mfa.aal !== "aal2") {
    redirect(mfa.temFator ? "/login/2fa" : "/login/2fa/configurar");
  }

  const sync = await getUltimaSync();

  return (
    <>
      <Orbs />
      {/* No layout, não numa tela: o alerta pode sair enquanto a pessoa está
          em qualquer parte da plataforma. Quem desligou em Minha conta nem
          monta o componente — assim também para de perguntar ao servidor. */}
      {user.alertFlyby && <AvisoVoo />}
      <div className="app">
        <Sidebar user={user} />
        <div className="main">
          <Topbar sync={sync} />
          <div className="content screen-fade">{children}</div>
        </div>
      </div>
    </>
  );
}
