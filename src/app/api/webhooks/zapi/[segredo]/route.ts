import { timingSafeEqual } from "node:crypto";
import { ehAvisoDeGrupo, lerEvento } from "@/lib/whatsapp/eventos";
import { gravarEventos } from "@/lib/whatsapp/store";

/**
 * Webhook da Z-API — entradas e saídas das comunidades.
 *
 * A Z-API **não assina as requisições**: não há cabeçalho de autenticação nem
 * HMAC na documentação. Quem descobrir a URL pode inventar eventos. Por isso a
 * proteção é nossa, em duas camadas:
 *
 *   1. um segredo no próprio caminho, comparado em tempo constante;
 *   2. o `instanceId` do corpo conferido contra o da nossa instância.
 *
 * Segredo errado responde 404, e não 401: quem está tentando adivinhar não
 * fica sabendo que existe um webhook aqui.
 *
 * Os avisos de grupo não têm webhook próprio — chegam no mesmo "Ao receber"
 * das mensagens. A maior parte do tráfego é mensagem comum, que é descartada
 * sem tocar no banco.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const naoAchei = () => new Response("Not found", { status: 404 });

/** Comparação de tamanho fixo: `===` em segredo vaza o tamanho pelo tempo. */
function confere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request, ctx: { params: Promise<{ segredo: string }> }) {
  const esperado = process.env.ZAPI_WEBHOOK_SECRET;
  // Sem segredo configurado o webhook fica fechado, em vez de aberto a todos.
  if (!esperado) {
    console.error("[zapi] ZAPI_WEBHOOK_SECRET não está configurado");
    return naoAchei();
  }

  const { segredo } = await ctx.params;
  if (!confere(segredo, esperado)) return naoAchei();

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ ok: false, motivo: "corpo inválido" }, { status: 400 });
  }

  // Se soubermos qual é a instância, um corpo de outra é descartado.
  const instancia = process.env.ZAPI_INSTANCE_ID;
  const doCorpo = (corpo as { instanceId?: string })?.instanceId;
  if (instancia && doCorpo && doCorpo !== instancia) {
    console.warn("[zapi] instância inesperada:", doCorpo);
    return naoAchei();
  }

  if (!ehAvisoDeGrupo(corpo)) {
    // Mensagem comum, status de entrega, presença: nada a fazer. Responder 200
    // é o que impede a Z-API de reenviar para sempre o que nunca vamos usar.
    return Response.json({ ok: true, ignorado: true });
  }

  const eventos = lerEvento(corpo);
  if (!eventos.length) return Response.json({ ok: true, ignorado: true });

  const r = await gravarEventos(eventos);
  if (r.erro) {
    // 500 aqui é de propósito: erro nosso, e a Z-API pode tentar de novo —
    // a chave de idempotência garante que repetir não duplica.
    console.error("[zapi] gravação:", r.erro);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true, gravados: r.gravados, repetidos: r.repetidos });
}

/** A Z-API não faz GET aqui; serve para conferir que a URL está de pé. */
export async function GET(_req: Request, ctx: { params: Promise<{ segredo: string }> }) {
  const esperado = process.env.ZAPI_WEBHOOK_SECRET;
  if (!esperado) return naoAchei();
  const { segredo } = await ctx.params;
  if (!confere(segredo, esperado)) return naoAchei();
  return Response.json({ ok: true, webhook: "zapi", pronto: true });
}
