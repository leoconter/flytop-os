"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Busca e filtro da lista.
 *
 * A busca vai pela URL, e não por estado local, para o resultado ser linkável
 * e sobreviver ao recarregar — quem manda "olha essa pessoa" precisa poder
 * mandar o endereço junto.
 */
export function FiltroPessoas({
  busca,
  status,
}: {
  busca: string;
  status?: "dentro" | "fora";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [texto, setTexto] = useState(busca);

  const irPara = (mudanca: Record<string, string | undefined>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudanca)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    // Filtro novo recomeça da primeira página: manter a 40 mostraria uma tela
    // vazia para uma busca que tem resultado.
    q.delete("pagina");
    router.push(`/comunidade/pessoas?${q.toString()}`);
  };

  return (
    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          irPara({ busca: texto.trim() || undefined });
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          className="input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Telefone ou nome"
          aria-label="Buscar pessoa"
          style={{ width: 220 }}
        />
        <button type="submit" className="btn btn-ghost btn-sm">
          Buscar
        </button>
      </form>

      <div className="seg" role="group" aria-label="Filtrar por status">
        {[
          { valor: undefined, texto: "Todos" },
          { valor: "dentro" as const, texto: "Dentro" },
          { valor: "fora" as const, texto: "Fora" },
        ].map((op) => (
          <button
            key={op.texto}
            type="button"
            className={status === op.valor ? "on" : undefined}
            onClick={() => irPara({ status: op.valor })}
          >
            {op.texto}
          </button>
        ))}
      </div>

      {(busca || status) && (
        <Link className="btn btn-ghost btn-sm" href="/comunidade/pessoas">
          limpar
        </Link>
      )}
    </div>
  );
}
