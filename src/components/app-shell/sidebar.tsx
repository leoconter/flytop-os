"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, navItems } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </span>
        <span className="brand-name">
          <b>FlyTop</b> <span className="os">OS</span>
        </span>
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
