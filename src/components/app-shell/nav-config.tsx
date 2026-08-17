import type { ReactNode } from "react";

export interface NavItem {
  key: string;
  label: string;
  /** Título exibido no breadcrumb da topbar. */
  title: string;
  href: string;
  group: string;
  badge?: string;
  icon: ReactNode;
}

const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const navItems: NavItem[] = [
  {
    key: "geral",
    label: "Dashboard Geral",
    title: "Dashboard Geral",
    href: "/",
    group: "Controle",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    key: "interno",
    label: "Controle Interno",
    title: "Controle Interno",
    href: "/interno",
    group: "Controle",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    key: "tarefas",
    label: "Tarefas",
    title: "Tarefas",
    href: "/tarefas",
    group: "Operação",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <path d="M9 11l2 2 4-4" />
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    key: "alertas",
    label: "Alertas",
    title: "Alertas",
    href: "/alertas",
    group: "Operação",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    ),
  },
  {
    key: "terrestres",
    label: "Terrestre",
    title: "Produtos Terrestres",
    href: "/terrestres",
    group: "Controle",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <path d="M3 21h18M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    key: "crm",
    label: "CRM",
    title: "CRM",
    href: "/crm",
    group: "Operação",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "vendedor",
    label: "Tela do Vendedor",
    title: "Tela do Vendedor",
    href: "/vendedor",
    group: "Operação",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
      </svg>
    ),
  },
  {
    key: "comunidade",
    label: "Comunidade",
    title: "Comunidade",
    href: "/comunidade",
    group: "Controle",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
      </svg>
    ),
  },
  {
    key: "monde",
    label: "Monde & Sincronização",
    title: "Monde & Sincronização",
    href: "/monde",
    group: "Administração",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </svg>
    ),
  },
  {
    key: "ads",
    label: "Métricas de Ads",
    title: "Métricas de Ads",
    href: "/ads",
    group: "Marketing",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <path d="M3 11l16-6v14L3 13z" />
        <path d="M3 11v2a3 3 0 0 0 3 3l1.5 4.5" />
      </svg>
    ),
  },
  {
    key: "social",
    label: "Social Media",
    title: "Social Media",
    href: "/social",
    group: "Marketing",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
    ),
  },
  {
    key: "configuracoes",
    label: "Configurações",
    title: "Configurações",
    href: "/configuracoes",
    group: "Administração",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
      </svg>
    ),
  },
  {
    key: "metas",
    label: "Metas",
    title: "Metas de Venda",
    href: "/metas",
    group: "Administração",
    icon: (
      <svg viewBox="0 0 24 24" {...sw}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.4" />
      </svg>
    ),
  },
];

/** Ordem dos grupos na sidebar. */
export const navGroups = ["Controle", "Operação", "Marketing", "Administração"];

/**
 * Telas que existem sem estar no menu: chega-se a elas de dentro da tela mãe.
 * Ficam aqui só para o breadcrumb ter o nome certo.
 */
const SUBTELAS: Record<string, string> = {
  "/interno/jornada": "Jornada de Compra",
  "/tarefas/nova": "Nova tarefa",
  "/crm/embarques": "Embarques",
  "/crm/retornos": "Retornos",
  "/crm/retornaram": "Já retornaram",
  "/metas/comissoes": "Comissões",
};

export function titleForPath(pathname: string): string {
  const exact = navItems.find((n) => n.href === pathname);
  if (exact) return exact.title;
  if (SUBTELAS[pathname]) return SUBTELAS[pathname];
  // sub-rota (ex.: /alertas/dados) → herda o título do item pai
  const parent = navItems
    .filter((n) => n.href !== "/" && pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return parent?.title ?? "Dashboard Geral";
}
