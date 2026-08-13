/**
 * Banco de alertas.
 *
 * Antes a tela guardava os alertas em memória do navegador, então recarregar
 * apagava tudo — e "marcar como enviado" não somava em lugar nenhum. Aqui eles
 * viram registro: o cadastro fica guardado, o envio é um carimbo de data, e a
 * contagem sai desse carimbo.
 */
import type { AlertFields } from "@/lib/alert-message";
import { db } from "@/lib/supabase";

export interface Alerta {
  id: string;
  fields: AlertFields;
  mensagem: string;
  /** ISO, ou null enquanto o alerta está na fila. */
  enviadoEm: string | null;
  criadoEm: string;
}

interface Linha {
  id: string;
  titulo: string;
  origem: string;
  destino: string;
  cabine: string | null;
  companhia: string | null;
  price_from: string | number | null;
  price_to: string | number | null;
  installments: number | null;
  ida_dates: string[] | null;
  volta_dates: string[] | null;
  message: string;
  sent_at: string | null;
  created_at: string;
}

const COLUNAS =
  "id, titulo, origem, destino, cabine, companhia, price_from, price_to, installments, ida_dates, volta_dates, message, sent_at, created_at";

/** Números chegam do Postgres como texto; o formulário trabalha com string. */
function texto(v: string | number | null): string {
  return v === null || v === undefined ? "" : String(Math.round(Number(v)));
}

function paraAlerta(r: Linha): Alerta {
  return {
    id: r.id,
    fields: {
      titulo: r.titulo,
      origem: r.origem,
      destino: r.destino,
      cabine: r.cabine ?? "",
      companhia: r.companhia ?? "",
      de: texto(r.price_from),
      por: texto(r.price_to),
      xjuros: r.installments === null ? "" : String(r.installments),
      idaDates: r.ida_dates ?? [],
      voltaDates: r.volta_dates ?? [],
    },
    mensagem: r.message,
    enviadoEm: r.sent_at,
    criadoEm: r.created_at,
  };
}

/** Tabela ainda não criada é diferente de banco fora do ar — e a tela diz qual. */
export type Listagem = { alertas: Alerta[] } | { erro: "sem-tabela" | "falhou" };

/** Códigos do PostgREST/Postgres para "essa tabela não existe". */
const SEM_TABELA = new Set(["42P01", "PGRST205"]);

/**
 * Todos os alertas, os da fila primeiro.
 *
 * A fila é o que exige ação — copiar e colar nos grupos — então ela abre a
 * tabela; o histórico do que já saiu vem embaixo, do mais recente ao mais
 * antigo.
 */
export async function listarAlertas(): Promise<Listagem> {
  const sb = db();
  if (!sb) return { erro: "falhou" };

  const { data, error } = await sb
    .from("alerts")
    .select(COLUNAS)
    .order("sent_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("[alertas] listar:", error.code, error.message);
    return { erro: SEM_TABELA.has(error.code ?? "") ? "sem-tabela" : "falhou" };
  }
  return { alertas: (data as unknown as Linha[]).map(paraAlerta) };
}

export async function buscarAlerta(id: string): Promise<Alerta | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb.from("alerts").select(COLUNAS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return paraAlerta(data as unknown as Linha);
}

/* ------------------------------- Gravação --------------------------------- */

function numero(v: string): number | null {
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function paraLinha(fields: AlertFields, mensagem: string) {
  return {
    titulo: fields.titulo.trim(),
    origem: fields.origem.trim(),
    destino: fields.destino.trim(),
    cabine: fields.cabine.trim() || null,
    companhia: fields.companhia.trim() || null,
    price_from: numero(fields.de),
    price_to: numero(fields.por),
    installments: numero(fields.xjuros),
    ida_dates: fields.idaDates,
    volta_dates: fields.voltaDates,
    message: mensagem,
  };
}

/** Devolve a mensagem de erro, ou null quando gravou. */
export async function criarAlerta(
  fields: AlertFields,
  mensagem: string,
  criadoPor: string | null,
): Promise<string | null> {
  const sb = db();
  if (!sb) return "O banco não está configurado.";

  const { error } = await sb
    .from("alerts")
    .insert({ ...paraLinha(fields, mensagem), created_by: criadoPor });

  if (error) {
    console.error("[alertas] criar:", error.message);
    return "Não foi possível salvar o alerta.";
  }
  return null;
}

export async function atualizarAlerta(
  id: string,
  fields: AlertFields,
  mensagem: string,
): Promise<string | null> {
  const sb = db();
  if (!sb) return "O banco não está configurado.";

  const { error } = await sb
    .from("alerts")
    .update({ ...paraLinha(fields, mensagem), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[alertas] atualizar:", error.message);
    return "Não foi possível salvar as alterações.";
  }
  return null;
}

/** Marca (ou desmarca) o envio. É esse carimbo que a contagem lê. */
export async function marcarEnvio(id: string, enviado: boolean): Promise<string | null> {
  const sb = db();
  if (!sb) return "O banco não está configurado.";

  const { error } = await sb
    .from("alerts")
    .update({
      sent_at: enviado ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[alertas] marcar envio:", error.message);
    return "Não foi possível registrar o envio.";
  }
  return null;
}

export async function excluirAlerta(id: string): Promise<string | null> {
  const sb = db();
  if (!sb) return "O banco não está configurado.";

  const { error } = await sb.from("alerts").delete().eq("id", id);
  if (error) {
    console.error("[alertas] excluir:", error.message);
    return "Não foi possível excluir o alerta.";
  }
  return null;
}

/* ------------------------------- Contagem --------------------------------- */

export interface Contagem {
  name: string;
  count: number;
}

export interface EstatisticasAlertas {
  enviadosHoje: number;
  enviadosMes: number;
  naFila: number;
  total: number;
  porCompanhia: Contagem[];
  porDestino: Contagem[];
  porCabine: Contagem[];
}

const spDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * "Hoje" e "este mês" em São Paulo, não em UTC: às 21h de Brasília já é o dia
 * seguinte em UTC, e o número do dia daria um salto errado à noite.
 */
function limitesSP(agora = new Date()): { hoje: string; mes: string } {
  const dia = spDia.format(agora);
  return { hoje: dia, mes: dia.slice(0, 7) };
}

/**
 * Os enviados dentro do período, pelo dia em São Paulo.
 *
 * O recorte é pela data de envio, não pela de cadastro: a pergunta da tela de
 * dados é "o que saiu para os grupos nesse intervalo".
 */
export function enviadosNoPeriodo(
  alertas: Alerta[],
  range: { since: string; until: string },
): Alerta[] {
  return alertas.filter((a) => {
    if (!a.enviadoEm) return false;
    const dia = spDia.format(new Date(a.enviadoEm));
    return dia >= range.since && dia <= range.until;
  });
}

/** Contagem por companhia, destino e cabine de um conjunto já recortado. */
export function contagens(enviados: Alerta[]) {
  return {
    porCompanhia: ranking(enviados, (a) => a.fields.companhia),
    porDestino: ranking(enviados, (a) => a.fields.destino),
    porCabine: ranking(enviados, (a) => a.fields.cabine),
  };
}

/** Só conta o que foi de fato enviado — o resto ainda é rascunho. */
function ranking(alertas: Alerta[], campo: (a: Alerta) => string): Contagem[] {
  const mapa = new Map<string, number>();
  for (const a of alertas) {
    const k = campo(a).trim();
    if (!k) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Números da tela, calculados a partir da lista já carregada.
 *
 * São algumas centenas de linhas no total, então contar em memória evita
 * quatro consultas agregadas para responder a mesma coisa.
 */
export function estatisticas(alertas: Alerta[], agora = new Date()): EstatisticasAlertas {
  const { hoje, mes } = limitesSP(agora);
  const enviados = alertas.filter((a) => a.enviadoEm);
  const diaSP = (iso: string) => spDia.format(new Date(iso));

  return {
    enviadosHoje: enviados.filter((a) => diaSP(a.enviadoEm!) === hoje).length,
    enviadosMes: enviados.filter((a) => diaSP(a.enviadoEm!).startsWith(mes)).length,
    naFila: alertas.length - enviados.length,
    total: alertas.length,
    ...contagens(enviados),
  };
}
