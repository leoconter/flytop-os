"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SellerChoice } from "@/lib/monde/vendor";

/**
 * Troca de qual vendedor a tela mostra. Só aparece para administradores — a
 * checagem que vale é do servidor; isto é só o controle.
 */
export function SellerSwitch({
  sellers,
  atual,
}: {
  sellers: SellerChoice[];
  atual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function trocar(sellerId: string) {
    const next = new URLSearchParams(params.toString());
    next.set("vendedor", sellerId);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="seller-switch">
      <span>Vendo como</span>
      <select
        className="select"
        value={atual}
        onChange={(e) => trocar(e.target.value)}
        aria-label="Escolher o vendedor exibido"
      >
        {sellers.map((s) => (
          <option key={s.sellerId} value={s.sellerId}>
            {s.name}
            {s.active === false ? " (inativo)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
