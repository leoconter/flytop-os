# FlyTop OS — Design System

Identidade visual da plataforma — direção **"Flight Deck"**: painel de
instrumentos de uma agência de viagens premium. Sidebar em azul-marinho
profundo com micro-acento de latão, conteúdo claro e neutro com cartões brancos
de borda fina, paleta dessaturada. Substituiu a fase de preview (glass/orbs
estilo iOS, extraída de `public/preview/dashboard-maio.html`), considerada
informal demais para a plataforma.

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
| `--accent-blue`        | `#1E56B8` | `accent-blue` (cobalto)   |
| `--accent-blue-dark`   | `#16418C` | `accent-blue-dark`    |
| `--accent-green`       | `#1E7A46` | `accent-green` (floresta) |
| `--accent-green-dark`  | `#175E37` | `accent-green-dark`   |
| `--accent-orange`      | `#B0761E` | `accent-orange` (âmbar queimado) |
| `--accent-orange-dark` | `#8A5C14` | `accent-orange-dark`  |
| `--accent-red`         | `#B3362C` | `accent-red`          |
| `--accent-red-dark`    | `#8F2921` | `accent-red-dark`     |
| `--accent-purple`      | `#50549F` | `accent-purple` (índigo-ardósia) |

Convenção: **azul** = realizado/principal · **verde** = meta/positivo ·
**laranja** = necessidade/atenção · **vermelho** = saídas/negativo ·
**roxo** = destaque/prévia. Cor extra de consolidadora "Direta": `#4A7FB5`
(azul-aço, só em dados).

### Navy e latão (marca / sidebar)

| Token          | Hex       | Uso                                        |
| -------------- | --------- | ------------------------------------------ |
| `--navy`       | `#0E2038` | sidebar (base do gradiente), ícone da marca |
| `--navy-raise` | `#10243D` | topo do gradiente da sidebar               |
| `--navy-deep`  | `#0B1A2C` | base do gradiente da sidebar               |
| `--brass`      | `#CFA95D` | acento de latão: "OS" do logo, barra da nav ativa, dots |
| `--brass-dark` | `#8C6D2F` | latão sobre fundo claro (ex.: `.rank.gold`) |

O latão é o único acento "quente" da identidade — usar com muita parcimônia
(logo, item ativo da nav, badge da sidebar). Nunca em botões ou gráficos.

### Superfície e texto

| Token       | Valor     | Uso                          |
| ----------- | --------- | ---------------------------- |
| `--bg`      | `#f2f3f6` | fundo da página (neutro frio) |
| `--text-1`  | `#171b22` | texto primário / títulos     |
| `--text-2`  | `#4e5563` | texto secundário             |
| `--text-3`  | `#7b8291` | texto terciário / labels     |

## Cartões (`.glass`)

A classe continua se chamando `.glass` (usada em todo o app), mas o estilo é
de cartão sólido profissional:

```
background:        rgba(255,255,255,0.82)   /* --glass */
border:            1px solid rgba(16,24,40,0.08)  /* --glass-border */
backdrop-filter:   blur(14px) saturate(140%)
border-radius:     16px (--radius-xl)
box-shadow:        0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.05)
```

Sem brilho de vidro no topo (o antigo `.glass::before` foi removido).
Superfícies internas (linhas de lista, inputs, chips) são brancas sólidas com
borda hairline `rgba(16,24,40,0.07–0.12)`.

## Raios

| Token            | Valor   | Tailwind     |
| ---------------- | ------- | ------------ |
| `--radius-xl`    | `16px`  | `rounded-xl` |
| `--radius-lg`    | `12px`  | `rounded-lg` |
| `--radius-md`    | `10px`  | `rounded-md` |
| `--radius-sm`    | `8px`   | `rounded-sm` (token) |
| `--radius-pill`  | `999px` | pílulas/chips |

## Fundo (`.orbs`)

Os orbs coloridos animados da fase de preview foram substituídos por uma
atmosfera estática: dois brilhos radiais quase imperceptíveis no topo da
página (cobalto ~6% à esquerda, latão ~5% à direita), sem animação. Os divs
`.orb` continuam no markup, mas com `display: none`.

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
