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

/**
 * Quem é a pessoa do aviso.
 *
 * O WhatsApp migrou para o LID: um identificador anônimo, estável por pessoa,
 * que **não revela o telefone**. Na carga inicial dos grupos, 99,8% dos
 * participantes vieram só com LID.
 *
 * Os dois nunca podem cair na mesma coluna. `193084734365861@lid` vira
 * `193084734365861` ao tirar os símbolos — quinze dígitos, cara de telefone
 * com DDI. Guardado como telefone, casaria com o número de algum cliente do
 * Monde e ligaria uma venda à pessoa errada. Por isso a separação é feita aqui,
 * na entrada, e não depois.
 */
export interface Identidade {
  phone: string | null;
  lid: string | null;
  /** O que identifica a pessoa: telefone quando existe, LID quando não. */
  key: string;
}

/**
 * A partir de quantos dígitos um número deixa de poder ser telefone.
 *
 * Os avisos do webhook trazem o LID **sem** o sufixo `@lid` — chegam como
 * "171171710501073", quinze dígitos secos. O sufixo não serve para separar,
 * então sobra o tamanho.
 *
 * Medido nos 80 mil participantes carregados: todo telefone real tem no máximo
 * 13 dígitos (Brasil 55+DDD+9, EUA 1+10, Portugal, Irlanda, Alemanha, Paraguai
 * — todos abaixo disso), e todo LID observado tem 14 ou mais.
 *
 * O E.164 admite até 15 dígitos, então a régua não é perfeita. Ela erra para o
 * lado certo: classificar um telefone como LID apenas deixa a pessoa sem
 * identificação, enquanto classificar um LID como telefone o ligaria ao número
 * de um cliente do Monde e atribuiria a venda a quem não comprou.
 */
const MAX_DIGITOS_TELEFONE = 13;

export function identidade(v: unknown): Identidade | null {
  const bruto = String(v ?? "").trim();
  if (!bruto) return null;

  const digitos = soDigitos(bruto.split("@")[0]);
  if (!digitos) return null;

  const ehLid = bruto.toLowerCase().includes("@lid") || digitos.length > MAX_DIGITOS_TELEFONE;
  if (ehLid) return { phone: null, lid: `${digitos}@lid`, key: `${digitos}@lid` };

  return { phone: digitos, lid: null, key: digitos };
}

export interface EventoGrupo {
  groupId: string;
  groupName: string | null;
  phone: string | null;
  lid: string | null;
  memberKey: string;
  actorPhone: string | null;
  actorLid: string | null;
  kind: Especie;
  notification: string;
  method: string | null;
  occurredAt: string;
  eventKey: string;
  /** O aviso como a Z-API mandou, para conferência posterior. */
  bruto: unknown;
  /**
   * O LID que veio no corpo do aviso, mesmo quando a pessoa foi identificada
   * pelo telefone. É o par que liga as duas formas da mesma pessoa.
   */
  lidDoCorpo: string | null;
  /** Nome do perfil, quando o aviso o traz de forma confiável. */
  nome: string | null;
}

interface Payload {
  type?: string;
  participantLid?: string | null;
  senderName?: string | null;
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

/** O `phone` de um grupo não é telefone: é "120363421170082651-group". */
function pareceGrupo(phone: unknown): boolean {
  const v = String(phone ?? "");
  return v.endsWith("-group") || v.includes("@g.us");
}

/**
 * É um aviso de grupo, e não uma mensagem comum?
 *
 * Não olha `isGroup` de propósito. Os avisos que já recebemos vêm com `true`,
 * como a documentação promete — mas a mesma Z-API lista esses mesmos grupos com
 * `isGroup: false` em `/groups`, porque são grupos de anúncio de comunidade.
 * Um campo que a própria API preenche de dois jeitos para o mesmo grupo não
 * serve de porteiro: no dia em que o aviso vier no formato da listagem, o
 * webhook descartaria em silêncio as entradas e saídas que existe para
 * capturar, e ninguém perceberia — o log simplesmente pararia de crescer.
 *
 * O que decide é o par que sempre vem junto: `notification` preenchido e um
 * `phone` no formato de grupo.
 */
export function ehAvisoDeGrupo(p: unknown): p is Payload {
  const x = p as Payload;
  if (!x || typeof x !== "object") return false;
  return Boolean(x.notification) && pareceGrupo(x.phone);
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
  const params = (p.notificationParameters ?? [])
    .map(identidade)
    .filter((x): x is Identidade => x !== null);
  if (!params.length) return [];

  /* Quando alguém age sobre outra pessoa — adicionar, remover — a Z-API manda
     quem agiu junto. Nesses casos o primeiro da lista é o autor; os demais são
     os afetados. Ao sair por conta própria, a lista traz só a pessoa. */
  const comAutor =
    params.length > 1 &&
    (notification === "GROUP_PARTICIPANT_ADD" ||
      notification === "GROUP_PARTICIPANT_REMOVE" ||
      notification === "MEMBERSHIP_APPROVAL_REQUEST");

  /* O `participantLid` vem preenchido em boa parte das saídas, inclusive nas
     que identificam a pessoa pelo telefone. Guardar os dois juntos é o que
     evita a mesma pessoa virar duas linhas. */
  const lidDoCorpo = identidade(p.participantLid)?.lid ?? null;

  /* `senderName` só é o nome de quem o evento trata quando a pessoa é a autora
     da ação — ou seja, quando ela mesma saiu. Em ADD o nome é de quem
     adicionou, e em INVITE vem a palavra "invite". */
  const nome =
    notification === "GROUP_PARTICIPANT_LEAVE" && p.senderName && p.senderName !== "invite"
      ? p.senderName.trim() || null
      : null;

  const autor = comAutor ? params[0] : null;
  const afetados = comAutor ? params.slice(1) : params;

  // O messageId identifica o aviso; a identidade separa as pessoas dentro dele.
  const base = String(p.messageId ?? `${groupId}-${p.momment ?? ""}`);

  return afetados.map((quem) => ({
    groupId,
    groupName,
    phone: quem.phone,
    lid: quem.lid,
    memberKey: quem.key,
    actorPhone: autor?.phone ?? null,
    actorLid: autor?.lid ?? null,
    kind,
    notification,
    method: p.requestMethod ?? null,
    occurredAt,
    eventKey: `${base}:${quem.key}:${notification}`,
    bruto: p,
    lidDoCorpo,
    nome,
  }));
}

/** Entrada e saída mexem no estado do membro; promoção e pedido não. */
export function mudaEstado(kind: Especie): "dentro" | "fora" | null {
  if (kind === "entrou") return "dentro";
  if (kind === "saiu" || kind === "removido") return "fora";
  return null;
}
