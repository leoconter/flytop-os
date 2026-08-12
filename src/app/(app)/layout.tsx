import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Orbs } from "@/components/orbs";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { currentUser } from "@/lib/auth/session";

/**
 * A checagem que vale.
 *
 * O `proxy.ts` só olha se existe cookie — é um filtro barato, que roda até em
 * rota pré-carregada. Aqui a sessão é validada no Supabase e o perfil é lido do
 * banco, antes de qualquer tela desenhar. Cookie inventado não passa daqui.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <>
      <Orbs />
      <div className="app">
        <Sidebar user={user} />
        <div className="main">
          <Topbar />
          <div className="content screen-fade">{children}</div>
        </div>
      </div>
    </>
  );
}
