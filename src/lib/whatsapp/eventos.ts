/**
 * Leitura dos avisos de grupo da Z-API.
 *
 * Os eventos de grupo não têm webhook próprio: chegam no mesmo "Ao receber"
 * das mensagens, como `type: "ReceivedCallback"` com o campo `notification`
 * preenchido. Por isso a primeira coisa que este módulo faz é separar o que é
 * aviso de grupo do que é mensagem comum — a maior parte do tráfego é mensagem,
 * e ela não nos interessa aqui.
 *
 * Referência: developer.z-api.io/webhooks/on-message-received-examples
 */

/** O que a Z-API pode mandar em `notification`, conforme a documentação. */
export const NOTIFICACOES = [
  "GROUP_CREATE",
  "GROUP_CHANGE_SUBJECT",
  "GROUP_CHANGE_DESCRIPTION",
  "GROUP_CHANGE_ICON",
  "GROUP_PARTICIPANT_PROMOTE",
  "GROUP_PARTICIPANT_DEMOTE",
  "GROUP_PARTICIPANT_LEAVE",
  "GROUP_PARTICIPANT_ADD",
  "GROUP_PARTICIPANT_REMOVE",
  "GROUP_PARTICIPANT_INVITE",
  "MEMBERSHIP_APPROVAL_REQUEST",
  "REVOKED_MEMBERSHIP_REQUESTS",
  "GROUP_SUSPENDED",
  "GROUP_UNSUSPENDED",
] as const;

export type Especie =
  | "entrou"
  | "saiu"
  | "removido"
  | "convidado"
  | "promovido"
  | "rebaixado"
  | "pediu_entrada"
  | "outro";

/**
 * De qual aviso nasce cada espécie.
 *
 * `GROUP_PARTICIPANT_ADD` e `..._INVITE` são as duas formas de entrar — pelo
 * admin ou pelo link. As duas contam como entrada; o "como" fica em `method`.
 * `LEAVE` é sair por vontade própria e `REMOVE` é ser tirado: contam juntos no
 * saldo, mas separá-los é o que permite distinguir desistência de expurgo.
 */
const ESPECIE: Record<string, Especie> = {
  GROUP_PARTICIPANT_ADD: "entrou",
  GROUP_PARTICIPANT_INVITE: "entrou",
  GROUP_PARTICIPANT_LEAVE: "saiu",
  GROUP_PARTICIPANT_REMOVE: "removido",
  GROUP_PARTICIPANT_PROMOTE: "promovido",
  GROUP_PARTICIPANT_DEMOTE: "rebaixado",
  MEMBERSHIP_APPROVAL_REQUEST: "pediu_entrada",
};

/** Avisos que falam do grupo, não de alguém — não viram entrada nem saída. */
const SEM_PARTICIPANTE = new Set([
  "GROUP_CREATE",
  "GROUP_CHANGE_SUBJECT",
  "GROUP_CHANGE_DESCRIPTION",
  "GROUP_CHANGE_ICON",
  "GROUP_SUSPENDED",
  "GROUP_UNSUSPENDED",
  "REVOKED_MEMBERSHIP_REQUESTS",
]);

/** Só dígitos, como em `monde_customers.mobile_number` — é o que cruza os dois. */
export function soDigitos(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

export interface EventoGrupo {
  groupId: string;
  groupName: string | null;
  phone: string;
  actorPhone: string | null;
  kind: Especie;
  notification: string;
  method: string | null;
  occurredAt: string;
  eventKey: string;
}

interface Payload {
  type?: string;
  isGroup?: boolean;
  notification?: string;
  notificationParameters?: unknown[];
  phone?: string;
  chatName?: string;
  connectedPhone?: string;
  messageId?: string;
  momment?: number;
  requestMethod?: string;
  instanceId?: string;
}

/** É um aviso de grupo, e não uma mensagem comum? */
export function ehAvisoDeGrupo(p: unknown): p is Payload {
  const x = p as Payload;
  return Boolean(x && typeof x === "object" && x.isGroup && x.notification);
}

/**
 * Transforma o aviso em uma linha por pessoa afetada.
 *
 * `notificationParameters` é uma lista: adicionar três pessoas de uma vez
 * chega como um aviso só. Cada uma vira um evento — senão duas das três
 * sumiriam da contagem.
 */
export function lerEvento(p: Payload): EventoGrupo[] {
  const notification = String(p.notification ?? "");
  const groupId = String(p.phone ?? "").trim();
  if (!groupId) return [];

  const occurredAt = new Date(
    typeof p.momment === "number" && p.momment > 0 ? p.momment : Date.now(),
  ).toISOString();
  const groupName = p.chatName?.trim() || null;

  if (SEM_PARTICIPANTE.has(notification)) return [];

  const kind = ESPECIE[notification] ?? "outro";
  const params = (p.notificationParameters ?? []).map(soDigitos).filter(Boolean);
  if (!params.length) return [];

  /* Quando alguém age sobre outra pessoa — adicionar, remover — a Z-API manda
     quem agiu junto. Nesses casos o primeiro da lista é o autor; os demais são
     os afetados. Ao sair por conta própria, a lista traz só a pessoa. */
  const comAutor =
    params.length > 1 &&
    (notification === "GROUP_PARTICIPANT_ADD" ||
      notification === "GROUP_PARTICIPANT_REMOVE" ||
      notification === "MEMBERSHIP_APPROVAL_REQUEST");

  const actorPhone = comAutor ? params[0] : null;
  const afetados = comAutor ? params.slice(1) : params;

  // O messageId identifica o aviso; o telefone separa as pessoas dentro dele.
  const base = String(p.messageId ?? `${groupId}-${p.momment ?? ""}`);

  return afetados.map((phone) => ({
    groupId,
    groupName,
    phone,
    actorPhone,
    kind,
    notification,
    method: p.requestMethod ?? null,
    occurredAt,
    eventKey: `${base}:${phone}:${notification}`,
  }));
}

/** Entrada e saída mexem no estado do membro; promoção e pedido não. */
export function mudaEstado(kind: Especie): "dentro" | "fora" | null {
  if (kind === "entrou") return "dentro";
  if (kind === "saiu" || kind === "removido") return "fora";
  return null;
}
