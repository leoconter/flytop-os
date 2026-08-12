"use client";

/**
 * Rede de segurança do app.
 *
 * Sem isto, qualquer exceção no servidor troca a tela inteira pela página de
 * erro do Next ("A server error occurred"), que não diz o que fazer nem
 * preserva a navegação. Aqui a moldura continua de pé e há um botão para
 * tentar de novo sem recarregar tudo.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="note-box red" style={{ alignItems: "flex-start" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <div className="nt">
        <b>Algo deu errado nesta tela.</b> Nada foi perdido — a página pode ser
        recarregada sem risco.
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset()}>
            Tentar de novo
          </button>
          {error.digest && (
            <span className="metric-hint">
              Código para investigar: <b>{error.digest}</b>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
