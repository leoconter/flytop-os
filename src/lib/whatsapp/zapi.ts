/**
 * Cliente da Z-API — leitura dos grupos.
 *
 * O webhook conta o que acontece de agora em diante; isto aqui responde a
 * outra pergunta, que o webhook nunca vai responder: quem já estava no grupo
 * antes de a gente começar a escutar. São os dois lados do mesmo número.
 *
 * Referência: developer.z-api.io
 */
// Extensão explícita porque `scripts/zapi-carga.mts` importa este módulo pelo
// Node, que não adivinha `.ts`. O tsconfig já permite (`allowImportingTsExtensions`).
import { identidade, type Identidade } from "./eventos.ts";

const BASE = "https://api.z-api.io/instances";

export interface Grupo {
  groupId: string;
  name: string | null;
  communityId: string | null;
  isAnnouncement: boolean;
}

export interface Participante extends Identidade {
  isAdmin: boolean;
}

export interface Metadados {
  groupId: string;
  name: string | null;
  communityId: string | null;
  isAnnouncement: boolean;
  invitationLink: string | null;
  participantes: Participante[];
}

export class ZApiError extends Error {}

interface Credenciais {
  instanceId: string;
  token: string;
  clientToken?: string | null;
}

export function credenciais(): Credenciais | null {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_INSTANCE_TOKEN;
  if (!instanceId || !token) return null;
  return { instanceId, token, clientToken: process.env.ZAPI_CLIENT_TOKEN ?? null };
}

async function get<T>(c: Credenciais, caminho: string): Promise<T> {
  const url = `${BASE}/${c.instanceId}/token/${c.token}${caminho}`;
  const res = await fetch(url, {
    headers: c.clientToken ? { "Client-Token": c.clientToken } : {},
  });

  const texto = await res.text();
  if (!res.ok) throw new ZApiError(`${res.status} em ${caminho}: ${texto.slice(0, 200)}`);

  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    throw new ZApiError(`resposta ilegível em ${caminho}: ${texto.slice(0, 200)}`);
  }

  // A Z-API responde 200 com `{error: ...}` no corpo em vez de status de erro:
  // sem esta checagem, o erro passaria por dado válido.
  const erro = (corpo as { error?: string })?.error;
  if (erro && !Array.isArray(corpo)) throw new ZApiError(`${caminho}: ${erro}`);

  return corpo as T;
}

const texto = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

/** Todos os grupos da instância, paginando até acabar. */
export async function listarGrupos(c: Credenciais): Promise<Grupo[]> {
  const grupos: Grupo[] = [];
  const TAMANHO = 50;

  for (let pagina = 1; pagina <= 200; pagina++) {
    const lote = await get<Array<Record<string, unknown>>>(
      c,
      `/groups?page=${pagina}&pageSize=${TAMANHO}`,
    );
    if (!Array.isArray(lote) || !lote.length) break;

    for (const g of lote) {
      const groupId = texto(g.phone);
      if (!groupId) continue;
      grupos.push({
        groupId,
        name: texto(g.name),
        communityId: texto(g.communityId),
        isAnnouncement: Boolean(g.isGroupAnnouncement),
      });
    }
    if (lote.length < TAMANHO) break;
  }

  return grupos;
}

/**
 * Participantes de um grupo.
 *
 * O `lid` vem em campo próprio e o `phone` costuma repetir o LID quando o
 * telefone não é conhecido — por isso a identidade é montada a partir do
 * telefone só quando ele existe de verdade.
 */
export async function metadados(c: Credenciais, groupId: string): Promise<Metadados> {
  const m = await get<Record<string, unknown>>(c, `/group-metadata/${groupId}`);
  const brutos = Array.isArray(m.participants) ? m.participants : [];

  const participantes: Participante[] = [];
  for (const p of brutos as Array<Record<string, unknown>>) {
    const doTelefone = identidade(p.phone);
    const doLid = identidade(p.lid);

    const quem: Identidade | null = doTelefone?.phone
      ? { phone: doTelefone.phone, lid: doLid?.lid ?? null, key: doTelefone.phone }
      : (doLid ?? doTelefone);

    if (!quem) continue;
    participantes.push({ ...quem, isAdmin: Boolean(p.isAdmin) || Boolean(p.isSuperAdmin) });
  }

  return {
    groupId,
    name: texto(m.subject) ?? texto(m.name),
    communityId: texto(m.communityId),
    isAnnouncement: Boolean(m.isGroupAnnouncement),
    invitationLink: texto(m.invitationLink),
    participantes,
  };
}
