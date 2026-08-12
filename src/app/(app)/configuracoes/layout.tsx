import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { ConfigTabs } from "./tabs";

/**
 * Configurações é área de administração: além do login, exige o papel.
 * A verificação é aqui, no servidor — esconder o item do menu não protege
 * nada, a URL continua digitável.
 */
export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  return (
    <>
      <ConfigTabs />
      {children}
    </>
  );
}
