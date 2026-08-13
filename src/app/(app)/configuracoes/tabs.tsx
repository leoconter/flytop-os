"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * `soAdmin` é só o que a aba mostra. Quem protege é cada rota, no servidor —
 * esconder o link não impede ninguém de digitar a URL.
 */
const ABAS = [
  { href: "/configuracoes", label: "Minha conta", soAdmin: false },
  { href: "/configuracoes/classes", label: "Classes tarifárias", soAdmin: true },
  { href: "/configuracoes/usuarios", label: "Usuários", soAdmin: true },
  { href: "/configuracoes/equipes", label: "Equipes", soAdmin: true },
];

export function ConfigTabs({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const abas = ABAS.filter((a) => admin || !a.soAdmin);

  // Uma aba sozinha não é uma escolha: para o vendedor, a tela é só a conta.
  if (abas.length < 2) return null;

  return (
    <nav className="tabs" aria-label="Seções de configurações">
      {abas.map((a) => (
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
