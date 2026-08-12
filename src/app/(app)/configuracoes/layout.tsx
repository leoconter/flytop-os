import type { ReactNode } from "react";
import { guardAdmin } from "@/lib/auth/session";
import { ConfigTabs } from "./tabs";

/**
 * Configurações é área de administração: além do login, exige o papel.
 * A verificação é aqui, no servidor — esconder o item do menu não protege
 * nada, a URL continua digitável.
 */
export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  await guardAdmin();

  return (
    <>
      <ConfigTabs />
      {children}
    </>
  );
}
