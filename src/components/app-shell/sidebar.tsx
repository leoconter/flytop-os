"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import { sair } from "@/app/login/actions";
import { navGroups, navItems } from "./nav-config";
import { SyncButtons } from "./sync-buttons";

/** Iniciais para o avatar: "Ana Júlia Gehling" → "AG". */
function iniciais(u: SessionUser): string {
  return ((u.firstName[0] ?? "") + (u.lastName[0] ?? "")).toUpperCase() || "?";
}

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  // O grupo Administração é só de quem administra.
  const grupos = navGroups.filter((g) => g !== "Administração" || user.role === "admin");

  return (
    <aside className="sidebar">
      <div className="brand">
        {/* Versão negativa da marca, feita para fundo escuro. */}
        <Image
          className="brand-logo"
          src="/flytop-os-logo.png"
          alt="FlyTop OS"
          width={760}
          height={235}
          priority
        />
      </div>

      {grupos.map((group) => (
        <div key={group} className="contents">
          <div className="nav-group-label">{group}</div>
          {navItems
            .filter((item) => item.group === group)
            .map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`nav-item${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
        </div>
      ))}

      <div className="sidebar-foot">
        {user.role === "admin" && <SyncButtons />}
        <div className="user-chip">
          {/* O vendedor não vê o grupo Administração, então é por aqui que ele
              chega às configurações da própria conta. */}
          <Link href="/configuracoes" className="user-eu" title="Minha conta">
            <span className="avatar">{iniciais(user)}</span>
            <div className="user-id">
              <div className="nm">{user.fullName}</div>
              <div className="rl">
                {user.role === "admin" ? "Administrador" : (user.teamName ?? "Vendedor")}
              </div>
            </div>
          </Link>
          <form action={sair}>
            <button type="submit" className="sair" title="Sair" aria-label="Sair">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
