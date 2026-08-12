import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Orbs } from "@/components/orbs";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { currentUser } from "@/lib/auth/session";
import { getUltimaSync } from "@/lib/monde/sync-status";

/**
 * A checagem que vale.
 *
 * O `proxy.ts` só olha se existe cookie — é um filtro barato, que roda até em
 * rota pré-carregada. Aqui a sessão é validada no Supabase e o perfil é lido do
 * banco, antes de qualquer tela desenhar. Cookie inventado não passa daqui.
 */
/** A atualização completa relê 47 páginas e leva ~1 minuto: o padrão não cobre. */
export const maxDuration = 180;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const sync = await getUltimaSync();

  return (
    <>
      <Orbs />
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
