import type { ReactNode } from "react";

/** Converte marcações do WhatsApp (*negrito*, _itálico_, ~tachado~) em nós React. */
function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    const inner = token.slice(1, -1);
    if (token[0] === "*") nodes.push(<strong key={key++}>{inner}</strong>);
    else if (token[0] === "_") nodes.push(<em key={key++}>{inner}</em>);
    else nodes.push(<del key={key++}>{inner}</del>);
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Bolha de mensagem do WhatsApp, atualizada ao vivo conforme o texto muda. */
export function WhatsAppPreview({ message }: { message: string }) {
  return (
    <div className="wa">
      <div className="wa-head">
        <span className="wa-av">FT</span>
        <div>
          <div className="wt">FlyTop · Alertas</div>
          <div className="ws">comunidade</div>
        </div>
      </div>
      <div className="wa-body">
        {message.trim() ? (
          <div className="wa-msg">
            <div className="wa-txt">{parseInline(message)}</div>
            <div className="wa-time">11:09 ✓✓</div>
          </div>
        ) : (
          <p className="wa-empty">
            Preencha o título e o destino para ver a mensagem aqui.
          </p>
        )}
      </div>
    </div>
  );
}
