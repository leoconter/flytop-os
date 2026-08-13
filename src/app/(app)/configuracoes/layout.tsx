import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { ConfigTabs } from "./tabs";

/**
 * Configurações deixou de ser área só de administrador: a aba da conta é de
 * cada pessoa. Por isso aqui só se exige estar logado — quem restringe é cada
 * rota administrativa, com `guardAdmin()`. Esconder a aba não protegeria nada,
 * a URL continua digitável.
 */
export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <>
      <ConfigTabs admin={user.role === "admin"} />
      {children}
    </>
  );
}
