"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/configuracoes", label: "Classes tarifárias" },
  { href: "/configuracoes/usuarios", label: "Usuários" },
  { href: "/configuracoes/equipes", label: "Equipes" },
];

export function ConfigTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Seções de configurações">
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
