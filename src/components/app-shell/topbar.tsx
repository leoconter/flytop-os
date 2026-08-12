"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PrivacyToggle } from "@/components/dashboard/privacy-toggle";
import { DateRangePicker } from "./date-range-picker";
import { DEFAULT_LABEL, periodDefaultFor, telaDeCadastro } from "@/lib/date-range";
import { titleForPath } from "./nav-config";

export function Topbar() {
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
        <span className="chip live">
          <span className="d" />
          Sincronizado
        </span>
        {!cadastro && <PrivacyToggle />}
      </div>
    </div>
  );
}
