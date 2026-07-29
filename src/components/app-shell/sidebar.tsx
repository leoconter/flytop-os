"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, navItems } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        {/* A logo tem o "fly" em azul-marinho, a mesma cor da sidebar; a placa
            branca preserva as cores originais da marca sem perder contraste. */}
        <Image
          className="brand-logo"
          src="/flytop-os-logo.png"
          alt="FlyTop OS"
          width={720}
          height={204}
          priority
        />
      </div>

      {navGroups.map((group) => (
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
        <span className="preview-pill">
          <span className="d" />
          Prévia · dados ilustrativos
        </span>
        <div className="user-chip">
          <span className="avatar">FT</span>
          <div>
            <div className="nm">FlyTop · Sócios</div>
            <div className="rl">Acesso administrador</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
