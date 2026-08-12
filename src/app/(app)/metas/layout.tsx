import type { ReactNode } from "react";
import { guardAdmin } from "@/lib/auth/session";

/** Metas é do grupo Administração: exige o papel, não só estar logado. */
export default async function MetasLayout({ children }: { children: ReactNode }) {
  await guardAdmin();
  return <>{children}</>;
}
