import type { ReactNode } from "react";
import { Orbs } from "@/components/orbs";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Orbs />
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar />
          <div className="content screen-fade">{children}</div>
        </div>
      </div>
    </>
  );
}
