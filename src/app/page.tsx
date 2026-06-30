export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Orbs de fundo — primitiva global definida em globals.css */}
      <div className="orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
        <div className="orb orb-5" />
      </div>

      <div className="relative z-[2] mx-auto max-w-3xl px-6 py-20">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-text-3">
          Plataforma interna
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-text-1">
          FlyTop OS
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-text-2">
          Base visual da plataforma. Os tokens de design (cores accent, glass,
          raios, tipografia Inter/JetBrains Mono e os orbs) vêm do dashboard de
          vendas validado e vivem em{" "}
          <code className="font-mono text-accent-blue">globals.css</code>.
        </p>

        <div className="glass mt-10 p-7">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[17px] font-semibold tracking-tight text-text-1">
              Dashboard de vendas · maio 2026
            </h2>
            <span className="text-[13px] text-text-2">preview estático</span>
          </div>
          <p className="mt-2 text-[14px] text-text-2">
            HTML standalone original (Chart.js, glass, toggle de privacidade).
            Ainda não portado para React.
          </p>
          <a
            href="/preview/dashboard-maio.html"
            className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[rgba(0,122,255,0.25)] bg-[rgba(0,122,255,0.12)] px-4 py-2 text-[13px] font-medium text-accent-blue transition-colors hover:bg-[rgba(0,122,255,0.2)]"
          >
            Abrir preview →
          </a>
        </div>

        {/* Amostra da paleta accent */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Swatch label="accent-blue" className="bg-accent-blue" />
          <Swatch label="accent-green" className="bg-accent-green" />
          <Swatch label="accent-orange" className="bg-accent-orange" />
        </div>
      </div>
    </main>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--glass)] px-3 py-2 text-[12px] text-text-2 [box-shadow:var(--shadow-glass)]">
      <span className={`h-4 w-4 rounded-full ${className}`} />
      <code className="font-mono">{label}</code>
    </span>
  );
}
