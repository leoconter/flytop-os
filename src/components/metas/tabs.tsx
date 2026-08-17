"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** As duas planilhas de Administração: o que se espera vender e o que se paga por vender. */
const ABAS = [
  { href: "/metas", label: "Metas de venda" },
  { href: "/metas/comissoes", label: "Comissões" },
];

export function MetasTabs() {
  const pathname = usePathname();

  return (
    <nav className="tabs" aria-label="Metas e comissões">
      {ABAS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`tab${pathname === a.href ? " on" : ""}`}
          aria-current={pathname === a.href ? "page" : undefined}
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
