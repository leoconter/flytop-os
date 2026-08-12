import type { ReactNode } from "react";
import { guardAdmin } from "@/lib/auth/session";

/**
 * A tela mostra o banco cru, incluindo dados de cliente: é área de
 * administração, e a checagem é no servidor.
 */
export default async function MondeLayout({ children }: { children: ReactNode }) {
  await guardAdmin();
  return <>{children}</>;
}
