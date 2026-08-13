"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Opcao {
  valor: string;
  rotulo: string;
}

/**
 * Filtros na URL, não em estado.
 *
 * Assim o recorte é linkável e sobrevive a recarregar — mesma escolha do
 * seletor de período do cabeçalho. A visão (quadro ou lista) viaja junto, e
 * por isso é preservada a cada mudança de filtro.
 */
export function Filtros({
  pessoas,
  modalidades,
  prioridades,
  mostrarConcluidas,
}: {
  pessoas: { userId: string; fullName: string }[];
  modalidades: Opcao[];
  prioridades: Opcao[];
  mostrarConcluidas: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [busca, setBusca] = useState(params.get("q") ?? "");

  function aplicar(mudancas: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    router.push(`${pathname}${s ? `?${s}` : ""}`);
  }

  const limpo = !["quem", "mod", "prio", "q", "fim"].some((k) => params.get(k));

  return (
    <div className="glass card tk-filtros">
      <form
        className="tk-busca"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar({ q: busca.trim() || null });
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          className="input"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título, localizador ou descrição"
          aria-label="Buscar tarefas"
        />
      </form>

      <select
        className="select"
        value={params.get("quem") ?? ""}
        onChange={(e) => aplicar({ quem: e.target.value || null })}
        aria-label="Filtrar por responsável"
      >
        <option value="">Todos os responsáveis</option>
        {pessoas.map((p) => (
          <option key={p.userId} value={p.userId}>
            {p.fullName}
          </option>
        ))}
      </select>

      <select
        className="select"
        value={params.get("mod") ?? ""}
        onChange={(e) => aplicar({ mod: e.target.value || null })}
        aria-label="Filtrar por modalidade"
      >
        <option value="">Todas as modalidades</option>
        {modalidades.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.rotulo}
          </option>
        ))}
      </select>

      <select
        className="select"
        value={params.get("prio") ?? ""}
        onChange={(e) => aplicar({ prio: e.target.value || null })}
        aria-label="Filtrar por prioridade"
      >
        <option value="">Todas as prioridades</option>
        {prioridades.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.rotulo}
          </option>
        ))}
      </select>

      {/* No quadro a coluna "Concluído" já mostra o que terminou; a opção só
          faz sentido na lista. */}
      {mostrarConcluidas && (
        <label className="tk-check">
          <input
            type="checkbox"
            checked={params.get("fim") === "1"}
            onChange={(e) => aplicar({ fim: e.target.checked ? "1" : null })}
          />
          Mostrar concluídas
        </label>
      )}

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={limpo}
        onClick={() => aplicar({ quem: null, mod: null, prio: null, q: null, fim: null })}
      >
        Limpar
      </button>
    </div>
  );
}
