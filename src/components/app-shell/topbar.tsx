"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PrivacyToggle } from "@/components/dashboard/privacy-toggle";
import { DateRangePicker } from "./date-range-picker";
import { DEFAULT_DAYS } from "@/lib/date-range";
import { titleForPath } from "./nav-config";

export function Topbar() {
  const pathname = usePathname();
  const title = titleForPath(pathname);

  return (
    <div className="topbar">
      <div className="crumb">
        FlyTop OS · <b>{title}</b>
      </div>
      <div className="topbar-actions">
        {/* useSearchParams exige Suspense para as rotas estáticas prerenderizarem. */}
        <Suspense
          fallback={<span className="chip">Últimos {DEFAULT_DAYS} dias</span>}
        >
          <DateRangePicker />
        </Suspense>
        <span className="chip live">
          <span className="d" />
          Sincronizado
        </span>
        <PrivacyToggle />
      </div>
    </div>
  );
}
