/**
 * Leitura e escrita das tarefas.
 *
 * Toda escrita passa por aqui e registra histórico junto: quem mudou o quê é
 * parte da alteração, não um detalhe opcional — se ficasse a cargo de quem
 * chama, cedo ou tarde alguma tela esqueceria.
 */
import { db } from "@/lib/supabase";
import {
  comoEtapa,
  comoModalidade,
  comoPrioridade,
  type Etapa,
  type Modalidade,
  type Prioridade,
} from "./modelo";

export interface Tarefa {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  locator: string | null;
  modality: Modalidade;
  priority: Prioridade;
  status: Etapa;
  position: number;
  assigneeId: string | null;
  assigneeName: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  comentarios: number;
  anexos: number;
  checklistTotal: number;
  checklistFeitos: number;
  /* Recorrência. `recurKind` nulo = a tarefa não repete. */
  recurKind: string | null;
  recurInterval: number;
  recurUnit: string | null;
  recurWeekdays: number[];
  recurMonthday: number | null;
  recurNewTask: boolean;
  recurResetStatus: string;
  recurNextAt: string | null;
}

const COLUNAS =
  "id, seq, title, description, locator, modality, priority, status, position, assignee_id, assignee_name, created_by, created_by_name, created_at, updated_at, completed_at, comments_count, attachments_count, checklist_total, checklist_done, recur_kind, recur_interval, recur_unit, recur_weekdays, recur_monthday, recur_new_task, recur_reset_status, recur_next_at";

type Linha = Record<string, unknown>;

function paraTarefa(r: Linha): Tarefa {
  return {
    id: r.id as string,
    seq: Number(r.seq),
    title: r.title as string,
    description: (r.description as string) ?? null,
    locator: (r.locator as string) ?? null,
    modality: comoModalidade(r.modality),
    priority: comoPrioridade(r.priority),
    status: comoEtapa(r.status),
    position: Number(r.position ?? 0),
    assigneeId: (r.assignee_id as string) ?? null,
    assigneeName: (r.assignee_name as string) ?? null,
    createdById: (r.created_by as string) ?? null,
    createdByName: (r.created_by_name as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    completedAt: (r.completed_at as string) ?? null,
    comentarios: Number(r.comments_count ?? 0),
    anexos: Number(r.attachments_count ?? 0),
    checklistTotal: Number(r.checklist_total ?? 0),
    checklistFeitos: Number(r.checklist_done ?? 0),
    recurKind: (r.recur_kind as string) ?? null,
    recurInterval: Number(r.recur_interval ?? 1),
    recurUnit: (r.recur_unit as string) ?? null,
    recurWeekdays: (r.recur_weekdays as number[]) ?? [],
    recurMonthday: r.recur_monthday === null || r.recur_monthday === undefined ? null : Number(r.recur_monthday),
    recurNewTask: Boolean(r.recur_new_task),
    recurResetStatus: (r.recur_reset_status as string) ?? "a_fazer",
    recurNextAt: (r.recur_next_at as string) ?? null,
  };
}

/** Tabela ainda não criada é diferente de banco fora do ar. */
export type Listagem = { tarefas: Tarefa[] } | { erro: "sem-tabela" | "falhou" };
const SEM_TABELA = new Set(["42P01", "PGRST205"]);

export interface Filtro {
  responsavel?: string | null;
  modalidade?: Modalidade | null;
  prioridade?: Prioridade | null;
  busca?: string | null;
  /** Sem isto a lista cresce para sempre com o que já foi concluído. */
  incluirConcluidas?: boolean;
}

export async function listarTarefas(f: Filtro = {}): Promise<Listagem> {
  const sb = db();
  if (!sb) return { erro: "falhou" };

  let q = sb.from("v_tasks").select(COLUNAS);

  if (f.responsavel) q = q.eq("assignee_id", f.responsavel);
  if (f.modalidade) q = q.eq("modality", f.modalidade);
  if (f.prioridade) q = q.eq("priority", f.prioridade);
  if (!f.incluirConcluidas) q = q.neq("status", "concluido");
  if (f.busca) {
    const t = f.busca.replace(/[%,()]/g, " ").trim();
    if (t) q = q.or(`title.ilike.%${t}%,locator.ilike.%${t}%,description.ilike.%${t}%`);
  }

  const { data, error } = await q.order("position").order("created_at", { ascending: false }).limit(500);

  if (error) {
    console.error("[tarefas] listar:", error.code, error.message);
    return { erro: SEM_TABELA.has(error.code ?? "") ? "sem-tabela" : "falhou" };
  }
  return { tarefas: (data as Linha[]).map(paraTarefa) };
}

export async function buscarTarefa(id: string): Promise<Tarefa | null> {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb.from("v_tasks").select(COLUNAS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return paraTarefa(data as Linha);
}

/* ------------------------------ Filhos ------------------------------------- */

export interface ItemChecklist {
  id: string;
  label: string;
  done: boolean;
  position: number;
}

export interface Comentario {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  editedAt: string | null;
}

export interface Anexo {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  uploadedByName: string | null;
}

export interface Evento {
  id: string;
  kind: string;
  field: string | null;
  from: string | null;
  to: string | null;
  actorName: string | null;
  createdAt: string;
}

/** Tudo o que a tela da tarefa mostra, numa ida só ao banco. */
export async function detalhesTarefa(id: string): Promise<{
  checklist: ItemChecklist[];
  comentarios: Comentario[];
  anexos: Anexo[];
  eventos: Evento[];
} | null> {
  const sb = db();
  if (!sb) return null;

  const [chk, com, anx, evt] = await Promise.all([
    sb.from("task_checklist_items").select("id, label, done, position").eq("task_id", id).order("position"),
    sb
      .from("task_comments")
      .select("id, body, author_id, created_at, edited_at, app_users(first_name, last_name)")
      .eq("task_id", id)
      .order("created_at"),
    sb
      .from("task_attachments")
      .select("id, file_name, mime_type, size_bytes, created_at, app_users(first_name, last_name)")
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
    sb
      .from("task_events")
      .select("id, kind, field, from_value, to_value, created_at, app_users(first_name, last_name)")
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const nome = (r: Linha): string | null => {
    const u = r.app_users as { first_name?: string; last_name?: string } | null;
    return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || null : null;
  };

  return {
    checklist: ((chk.data ?? []) as Linha[]).map((r) => ({
      id: r.id as string,
      label: r.label as string,
      done: Boolean(r.done),
      position: Number(r.position ?? 0),
    })),
    comentarios: ((com.data ?? []) as Linha[]).map((r) => ({
      id: r.id as string,
      body: r.body as string,
      authorId: (r.author_id as string) ?? null,
      authorName: nome(r),
      createdAt: r.created_at as string,
      editedAt: (r.edited_at as string) ?? null,
    })),
    anexos: ((anx.data ?? []) as Linha[]).map((r) => ({
      id: r.id as string,
      fileName: r.file_name as string,
      mimeType: (r.mime_type as string) ?? null,
      sizeBytes: r.size_bytes === null ? null : Number(r.size_bytes),
      createdAt: r.created_at as string,
      uploadedByName: nome(r),
    })),
    eventos: ((evt.data ?? []) as Linha[]).map((r) => ({
      id: r.id as string,
      kind: r.kind as string,
      field: (r.field as string) ?? null,
      from: (r.from_value as string) ?? null,
      to: (r.to_value as string) ?? null,
      actorName: nome(r),
      createdAt: r.created_at as string,
    })),
  };
}

/* ------------------------------ Histórico ---------------------------------- */

export interface Registro {
  kind: string;
  field?: string | null;
  from?: string | null;
  to?: string | null;
}

/** Anota no histórico. Falha aqui não derruba a alteração que já aconteceu. */
export async function registrar(taskId: string, actorId: string | null, itens: Registro[]) {
  if (!itens.length) return;
  const sb = db();
  if (!sb) return;
  const { error } = await sb.from("task_events").insert(
    itens.map((e) => ({
      task_id: taskId,
      actor_id: actorId,
      kind: e.kind,
      field: e.field ?? null,
      from_value: e.from ?? null,
      to_value: e.to ?? null,
    })),
  );
  if (error) console.error("[tarefas] historico:", error.message);
}

/* ------------------------------ Ordenação ---------------------------------- */

/**
 * Posição de um cartão solto entre dois vizinhos.
 *
 * A média dos vizinhos evita reescrever a coluna inteira a cada arrasto. Em
 * teoria a precisão do float acabaria depois de ~50 inserções seguidas no
 * mesmo ponto; na prática isso não acontece numa fila de tarefas, e o custo
 * de renumerar tudo a cada movimento seria pago sempre.
 */
export function entre(anterior: number | null, proxima: number | null): number {
  if (anterior === null && proxima === null) return 0;
  if (anterior === null) return proxima! - 1;
  if (proxima === null) return anterior + 1;
  return (anterior + proxima) / 2;
}
