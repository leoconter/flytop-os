"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PrivacyToggle } from "@/components/dashboard/privacy-toggle";
import { DateRangePicker } from "./date-range-picker";
import { DEFAULT_LABEL, periodDefaultFor, telaDeCadastro } from "@/lib/date-range";
import type { UltimaSync } from "@/lib/monde/sync-status";
import { titleForPath } from "./nav-config";

export function Topbar({ sync }: { sync: UltimaSync | null }) {
  const pathname = usePathname();
  const title = titleForPath(pathname);
  // Cadastro não tem período nem valor a esconder: o cabeçalho fica só com o
  // selo de sincronização.
  const cadastro = telaDeCadastro(pathname);

  return (
    <div className="topbar">
      <div className="crumb">
        FlyTop OS · <b>{title}</b>
      </div>
      <div className="topbar-actions">
        {/* useSearchParams exige Suspense para as rotas estáticas prerenderizarem. */}
        {!cadastro && (
          <Suspense
            fallback={
              <span className="chip">{DEFAULT_LABEL[periodDefaultFor(pathname)]}</span>
            }
          >
            <DateRangePicker />
          </Suspense>
        )}
        {/* Data real da última carga: um selo fixo dizendo "Sincronizado"
            continuaria verde mesmo com a atualização falhando. */}
        <span
          className={`chip ${sync && !sync.ok ? "falhou" : "live"}`}
          title={sync?.erro ?? "Última leitura dos dados do Monde"}
        >
          <span className="d" />
          {sync ? (sync.ok ? `Atualizado ${sync.quando}` : `Falha ${sync.quando}`) : "Sem atualização"}
        </span>
        {!cadastro && <PrivacyToggle />}
      </div>
    </div>
  );
}
