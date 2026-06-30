import type { ReactNode } from "react";
import { PageHead, Pill } from "@/components/dashboard/ui";

/**
 * Placeholder de tela ainda não portada (fase de fundação). Mantém o shell e a
 * navegação funcionando; o conteúdo entra nas próximas iterações.
 */
export function ScreenPlaceholder({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
}) {
  return (
    <>
      <PageHead
        eyebrow={eyebrow}
        title={title}
        sub={sub}
        right={<Pill tone="blue">Em breve</Pill>}
      />
      <div className="glass card" style={{ textAlign: "center", padding: "3rem 1.6rem" }}>
        <p className="section-title" style={{ marginBottom: 8 }}>
          Tela em construção
        </p>
        <p className="page-sub" style={{ margin: "0 auto", maxWidth: 460 }}>
          Esta tela faz parte da Fase 1 e será montada na sequência, seguindo o
          mesmo padrão visual das telas Geral e Interno.
        </p>
      </div>

      <div className="foot-note">
        <span>FlyTop OS · Prévia da Fase 1 · dados ilustrativos</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
