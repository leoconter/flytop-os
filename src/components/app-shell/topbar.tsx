"use client";

import { usePathname } from "next/navigation";
import { PrivacyToggle } from "@/components/dashboard/privacy-toggle";
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
        <span className="chip">Maio 2026 · até 11/05</span>
        <span className="chip live">
          <span className="d" />
          Sincronizado
        </span>
        <PrivacyToggle />
      </div>
    </div>
  );
}
