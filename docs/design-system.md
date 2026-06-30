# FlyTop OS — Design System

Identidade visual da plataforma. **Origem:** extraída do `:root` e do CSS do
dashboard de vendas validado (`public/preview/dashboard-maio.html`). Esse HTML é
a referência canônica; os tokens abaixo são a tradução dele para o projeto.

**Onde os tokens vivem:** [`src/app/globals.css`](../src/app/globals.css) —
CSS vars no `:root` (fonte da verdade) + bloco `@theme inline` que as expõe como
utilitários do Tailwind v4 (ex.: `text-accent-blue`, `bg-bg`, `rounded-xl`).
Não há `tailwind.config.ts` — no Tailwind v4 o tema mora no CSS.

---

## Tipografia

| Uso        | Família           | Carregada via                          |
| ---------- | ----------------- | -------------------------------------- |
| Texto/UI   | **Inter**         | `next/font` → `--font-inter` (400–700) |
| Mono/dados | **JetBrains Mono**| `next/font` → `--font-jetbrains-mono` (500) |

Fallback: `-apple-system, "SF Pro Display/Text", system-ui`. Os números usam
`font-variant-numeric: tabular-nums` para alinhamento em tabelas/métricas.
No Tailwind: `font-sans` (Inter) e `font-mono` (JetBrains Mono).

## Paleta

### Accent

| Token                 | Hex       | Tailwind                  |
| --------------------- | --------- | ------------------------- |
| `--accent-blue`        | `#007AFF` | `accent-blue`         |
| `--accent-blue-dark`   | `#0056CC` | `accent-blue-dark`    |
| `--accent-green`       | `#34C759` | `accent-green`        |
| `--accent-green-dark`  | `#248A3D` | `accent-green-dark`   |
| `--accent-orange`      | `#FF9500` | `accent-orange`       |
| `--accent-orange-dark` | `#C76E00` | `accent-orange-dark`  |
| `--accent-red`         | `#FF3B30` | `accent-red`          |
| `--accent-red-dark`    | `#C8281F` | `accent-red-dark`     |
| `--accent-purple`      | `#5E5CE6` | `accent-purple`       |

Convenção: **azul** = realizado/principal · **verde** = meta/positivo ·
**laranja** = necessidade/atenção · **vermelho** = saídas/negativo ·
**roxo** = destaque/prévia.

### Superfície e texto

| Token       | Valor     | Uso                          |
| ----------- | --------- | ---------------------------- |
| `--bg`      | `#f5f5f7` | fundo da página              |
| `--text-1`  | `#1d1d1f` | texto primário / títulos     |
| `--text-2`  | `#6e6e73` | texto secundário             |
| `--text-3`  | `#86868b` | texto terciário / labels     |

## Glass

Cartão translúcido padrão da plataforma. Classe global `.glass`.

```
background:        rgba(255,255,255,0.55)   /* --glass */
border:            1px solid rgba(255,255,255,0.7)  /* --glass-border */
backdrop-filter:   blur(40px) saturate(180%)
border-radius:     24px (--radius-xl)
box-shadow:        --shadow-glass (inset highlights + 3 camadas de sombra)
```

Inclui um realce superior de 1px (`.glass::before`) — gradiente branco
horizontal que dá o brilho de vidro no topo do card.

## Raios

| Token            | Valor   | Tailwind     |
| ---------------- | ------- | ------------ |
| `--radius-xl`    | `24px`  | `rounded-xl` |
| `--radius-lg`    | `18px`  | `rounded-lg` |
| `--radius-md`    | `14px`  | `rounded-md` |
| `--radius-sm`    | `10px`  | `rounded-sm` (token) |
| `--radius-pill`  | `999px` | pílulas/botões |

Glass forte: `--glass-strong` `rgba(255,255,255,0.72)` para superfícies que
precisam de mais opacidade que o `.glass` padrão.

## Orbs de fundo

5 esferas coloridas com `filter: blur(110px)`, em `position: fixed` atrás do
conteúdo (`z-index: 0`; conteúdo em `z-index: 2`). Cada uma tem uma animação
`drift` própria (26–34s, ease-in-out, infinita). Classe global `.orbs` > `.orb`.

| Orb   | Cor       | Aproximado            |
| ----- | --------- | --------------------- |
| orb-1 | `#5E5CE6` | índigo, topo-esquerda |
| orb-2 | `#32ADE6` | azul, meio-direita    |
| orb-3 | `#FF2D55` | rosa, base            |
| orb-4 | `#34C759` | verde                 |
| orb-5 | `#FF9F0A` | âmbar, topo-direita   |

Respeita `prefers-reduced-motion: reduce` (animação desligada).
Há também um overlay de ruído sutil (`feTurbulence` em SVG, opacity ~0.025) no
HTML original para textura — ainda não portado para o `globals.css`.

## Padrões de interação (do dashboard)

- **Toggle de privacidade:** classe `body.blur-on` aplica `filter: blur(...)` a
  valores financeiros (`.private`) e ao gráfico; estado persiste em
  `localStorage` (`flytop-blur`). Hover revela temporariamente.
- **Chart.js:** linhas Realizado / Projeção (pace) / Necessidade / Meta, com
  bandas verticais sutis atrás de dias não úteis (plugin `weekendBand`). Pace e
  necessidade avançam apenas em dias úteis (seg–sex, excluindo feriados).

## App shell (Fase 1)

A plataforma usa um shell único com **sidebar fixa + topbar sticky**, e cada
tela é uma **rota real** do App Router (sidebar persiste via layout). Origem:
preview da Fase 1.

- **Layout:** `src/app/(app)/layout.tsx` → `Orbs` + `.app` (`Sidebar` + `.main`
  com `Topbar` + `.content`).
- **Sidebar** (`.sidebar`): brand, grupos de navegação (`Dashboards`,
  `Operação`, `Marketing`), `.nav-item` (com `.active` por `usePathname`),
  `.nav-badge`, `.preview-pill`, `.user-chip`. Config em
  `src/components/app-shell/nav-config.tsx`.
- **Topbar** (`.topbar`): breadcrumb (`.crumb`), `.chip`/`.chip.live` e o toggle
  de privacidade.

### Rotas

| Rota | Tela | Status |
| --- | --- | --- |
| `/` | Dashboard Geral | ✅ |
| `/interno` | Dashboard Interno | ✅ |
| `/vendedor` `/alertas` `/comunidade` `/jornada` `/monde` `/ads` | demais | placeholder |

### Primitivas adicionadas ao `globals.css`

`.page-head` `.eyebrow` `.page-title` `.pill(.blue)` · `.metrics`/`.metric`
(tons `.blue/.green/.red`, `.metric-bar(.green)`) · `.section`/`.grid-2(.fixed)`
· `.chart-card`/`.chart-box(.sm)`/`.chart-legend` · `.list`/`.list-row(.me)`/`.rank(.gold)`
· `.table-wrap`/`table`/`.badge(.green/.orange/.blue/.gray)`/`.share` ·
`.stat`/`.progress-line`/`.note-box` · `.foot-note`.

### Gráficos

`react-chartjs-2` + Chart.js, registro central em
`src/components/charts/register.ts` (helpers `glassTooltip`, `brl`, `moneyTick`).
Tipos: linha (acumulado/pace), barra (receita por mês), doughnut (consolidadoras).

## Próximos passos

- [ ] Portar as 6 telas restantes (Vendedor, Alertas, Comunidade, Jornada,
  Monde/Sync, Ads) — incluindo formulários, preview de WhatsApp, tabela de
  comunidades e gráficos diverging/bar+line.
- [ ] Plugar dados reais via Supabase/Monde no lugar dos mocks em `src/lib`.
- [ ] Avaliar portar o overlay de ruído (`feTurbulence`) e suporte a dark mode.
