"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AcaoState } from "@/components/form-acao";
import { currentUser } from "@/lib/auth/session";
import { apagarObjeto, TAMANHO_MAX, urlDeEnvio } from "@/lib/tarefas/anexos";
import {
  comoEtapa,
  comoModalidade,
  comoPrioridade,
  ETAPA_LABEL,
  MODALIDADE_LABEL,
  PRIORIDADE_LABEL,
} from "@/lib/tarefas/modelo";
import { entre, registrar, type Registro } from "@/lib/tarefas/store";
import { db } from "@/lib/supabase";

/**
 * Erros viram estado, nunca exceção: título vazio ou tarefa já apagada por
 * outra pessoa são uso normal, e `throw` numa Server Action troca a tela
 * inteira por uma página de erro.
 */

function texto(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

function atualiza(id: string) {
  revalidatePath("/tarefas");
  revalidatePath(`/tarefas/${id}`);
}

/* -------------------------------- Criar ------------------------------------ */

export async function criarTarefa(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const title = texto(fd, "title");
  if (!title) return { erro: "Informe o título da tarefa." };

  const status = comoEtapa(fd.get("status"));

  // Entra no topo da coluna: tarefa nova é o que se olha primeiro.
  const { data: primeira } = await sb
    .from("tasks")
    .select("position")
    .eq("status", status)
    .order("position")
    .limit(1)
    .maybeSingle();

  const { data, error } = await sb
    .from("tasks")
    .insert({
      title,
      description: texto(fd, "description") || null,
      locator: texto(fd, "locator") || null,
      modality: comoModalidade(fd.get("modality")),
      priority: comoPrioridade(fd.get("priority")),
      status,
      assignee_id: texto(fd, "assignee") || null,
      position: entre(null, primeira ? Number(primeira.position) : null),
      created_by: user.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[tarefas] criar:", error?.message);
    return { erro: "Não foi possível criar a tarefa." };
  }

  await registrar(data.id as string, user.userId, [{ kind: "criou" }]);
  revalidatePath("/tarefas");
  // Fora de try/catch: `redirect` sinaliza por exceção e precisa chegar ao framework.
  redirect(`/tarefas/${data.id}`);
}

/* ------------------------------- Editar ------------------------------------ */

const CAMPOS = ["title", "description", "locator", "modality", "priority", "status", "assignee"] as const;

/** Texto de um valor para o histórico — código cru não diz nada a quem lê. */
function legivel(campo: string, valor: string | null, nomes: Map<string, string>): string | null {
  if (!valor) return null;
  if (campo === "status") return ETAPA_LABEL[comoEtapa(valor)];
  if (campo === "priority") return PRIORIDADE_LABEL[comoPrioridade(valor)];
  if (campo === "modality") return MODALIDADE_LABEL[comoModalidade(valor)];
  if (campo === "assignee") return nomes.get(valor) ?? "alguém";
  return valor;
}

export async function editarTarefa(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const id = texto(fd, "id");
  const title = texto(fd, "title");
  if (!id) return { erro: "Tarefa não encontrada." };
  if (!title) return { erro: "O título não pode ficar vazio." };

  const { data: antes } = await sb
    .from("tasks")
    .select("title, description, locator, modality, priority, status, assignee_id")
    .eq("id", id)
    .maybeSingle();
  if (!antes) return { erro: "Essa tarefa não existe mais." };

  const novo: Record<string, string | null> = {
    title,
    description: texto(fd, "description") || null,
    locator: texto(fd, "locator") || null,
    modality: comoModalidade(fd.get("modality")),
    priority: comoPrioridade(fd.get("priority")),
    status: comoEtapa(fd.get("status")),
    assignee: texto(fd, "assignee") || null,
  };

  const anterior: Record<string, string | null> = {
    title: antes.title as string,
    description: (antes.description as string) ?? null,
    locator: (antes.locator as string) ?? null,
    modality: antes.modality as string,
    priority: antes.priority as string,
    status: antes.status as string,
    assignee: (antes.assignee_id as string) ?? null,
  };

  const mudou = CAMPOS.filter((c) => novo[c] !== anterior[c]);
  if (!mudou.length) return { ok: "Nada mudou." };

  const { error } = await sb
    .from("tasks")
    .update({
      title: novo.title,
      description: novo.description,
      locator: novo.locator,
      modality: novo.modality,
      priority: novo.priority,
      status: novo.status,
      assignee_id: novo.assignee,
      // O carimbo de conclusão acompanha a etapa: voltar atrás precisa limpar,
      // senão a tarefa ficaria "concluída em" enquanto está em andamento.
      completed_at: novo.status === "concluido" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[tarefas] editar:", error.message);
    return { erro: "Não foi possível salvar as alterações." };
  }

  const nomes = await nomesDeUsuarios(mudou.includes("assignee"));
  await registrar(
    id,
    user.userId,
    mudou.map<Registro>((c) => ({
      kind: "alterou",
      field: c,
      from: legivel(c, anterior[c], nomes),
      to: legivel(c, novo[c], nomes),
    })),
  );

  atualiza(id);
  return { ok: "Alterações salvas." };
}

/** Só busca nomes quando o responsável mudou — o histórico é quem precisa. */
async function nomesDeUsuarios(precisa: boolean): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  if (!precisa) return m;
  const sb = db();
  if (!sb) return m;
  const { data } = await sb.from("v_app_users").select("user_id, full_name");
  for (const u of data ?? []) m.set(u.user_id as string, u.full_name as string);
  return m;
}

/* ------------------------- Mover no kanban --------------------------------- */

/**
 * Arrastar um cartão. Recebe os vizinhos de destino e calcula a posição no
 * meio deles — não renumera a coluna.
 */
export async function moverTarefa(
  id: string,
  destino: string,
  antesDe: number | null,
  depoisDe: number | null,
): Promise<{ erro?: string }> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const status = comoEtapa(destino);
  const { data: antes } = await sb.from("tasks").select("status").eq("id", id).maybeSingle();
  if (!antes) return { erro: "Essa tarefa não existe mais." };

  const { error } = await sb
    .from("tasks")
    .update({
      status,
      position: entre(depoisDe, antesDe),
      completed_at: status === "concluido" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[tarefas] mover:", error.message);
    return { erro: "Não foi possível mover a tarefa." };
  }

  // Reordenar dentro da mesma coluna não é mudança de etapa: não vira linha
  // no histórico, senão ele encheria de ruído.
  if (antes.status !== status) {
    await registrar(id, user.userId, [
      {
        kind: "alterou",
        field: "status",
        from: ETAPA_LABEL[comoEtapa(antes.status)],
        to: ETAPA_LABEL[status],
      },
    ]);
  }

  atualiza(id);
  return {};
}

export async function excluirTarefa(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const id = texto(fd, "id");
  // Os arquivos não caem junto com a linha: o Storage não conhece a chave
  // estrangeira, então os objetos precisam sair na mão.
  const { data: anexos } = await sb.from("task_attachments").select("storage_path").eq("task_id", id);
  for (const a of anexos ?? []) await apagarObjeto(a.storage_path as string);

  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) {
    console.error("[tarefas] excluir:", error.message);
    return { erro: "Não foi possível excluir a tarefa." };
  }

  revalidatePath("/tarefas");
  redirect("/tarefas");
}

/* ------------------------------ Checklist ---------------------------------- */

export async function adicionarItem(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const taskId = texto(fd, "taskId");
  const label = texto(fd, "label");
  if (!label) return { erro: "Escreva o item." };

  const { data: ultima } = await sb
    .from("task_checklist_items")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await sb.from("task_checklist_items").insert({
    task_id: taskId,
    label,
    position: entre(ultima ? Number(ultima.position) : null, null),
  });
  if (error) return { erro: "Não foi possível adicionar o item." };

  atualiza(taskId);
  return { ok: "Item adicionado." };
}

export async function alternarItem(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const taskId = texto(fd, "taskId");
  const itemId = texto(fd, "itemId");
  const feito = texto(fd, "feito") === "1";

  const { error } = await sb
    .from("task_checklist_items")
    .update({
      done: feito,
      done_at: feito ? new Date().toISOString() : null,
      done_by: feito ? user.userId : null,
    })
    .eq("id", itemId);
  if (error) return { erro: "Não foi possível marcar o item." };

  atualiza(taskId);
  return { ok: " " };
}

export async function removerItem(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };
  const taskId = texto(fd, "taskId");
  const { error } = await sb.from("task_checklist_items").delete().eq("id", texto(fd, "itemId"));
  if (error) return { erro: "Não foi possível remover o item." };
  atualiza(taskId);
  return { ok: " " };
}

/* ----------------------------- Comentários --------------------------------- */

export async function comentar(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const taskId = texto(fd, "taskId");
  const body = texto(fd, "body");
  if (!body) return { erro: "Escreva o comentário." };

  const { error } = await sb
    .from("task_comments")
    .insert({ task_id: taskId, author_id: user.userId, body });
  if (error) return { erro: "Não foi possível comentar." };

  await registrar(taskId, user.userId, [{ kind: "comentou" }]);
  atualiza(taskId);
  return { ok: " " };
}

export async function removerComentario(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const taskId = texto(fd, "taskId");
  const id = texto(fd, "id");

  const { data: c } = await sb.from("task_comments").select("author_id").eq("id", id).maybeSingle();
  if (!c) return { erro: "Esse comentário não existe mais." };
  // Cada um apaga o que escreveu; administrador apaga qualquer um.
  if (c.author_id !== user.userId && user.role !== "admin") {
    return { erro: "Só quem escreveu pode apagar o comentário." };
  }

  const { error } = await sb.from("task_comments").delete().eq("id", id);
  if (error) return { erro: "Não foi possível apagar o comentário." };

  atualiza(taskId);
  return { ok: " " };
}

/* ------------------------------- Anexos ------------------------------------ */

/** Passo 1: o navegador pede para onde mandar o arquivo. */
export async function pedirEnvio(
  taskId: string,
  fileName: string,
  size: number,
): Promise<{ url?: string; path?: string; erro?: string }> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  if (size > TAMANHO_MAX) {
    return { erro: `Arquivo muito grande (máximo ${TAMANHO_MAX / 1024 / 1024} MB).` };
  }

  const envio = await urlDeEnvio(taskId, fileName);
  if (!envio) return { erro: "Não foi possível preparar o envio." };
  return { url: envio.url, path: envio.path };
}

/** Passo 2: o arquivo já subiu; agora vira linha. */
export async function registrarAnexo(
  taskId: string,
  path: string,
  fileName: string,
  mime: string,
  size: number,
): Promise<{ erro?: string }> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  // O caminho é gerado pelo servidor e começa com o id da tarefa; conferir
  // impede que um caminho forjado grave um anexo em outra tarefa.
  if (!path.startsWith(`${taskId}/`)) return { erro: "Envio inválido." };

  const { error } = await sb.from("task_attachments").insert({
    task_id: taskId,
    storage_path: path,
    file_name: fileName.slice(0, 200),
    mime_type: mime || null,
    size_bytes: size,
    uploaded_by: user.userId,
  });
  if (error) {
    console.error("[tarefas] anexo:", error.message);
    return { erro: "O arquivo subiu, mas não foi possível registrá-lo." };
  }

  await registrar(taskId, user.userId, [{ kind: "anexou", to: fileName }]);
  atualiza(taskId);
  return {};
}

export async function removerAnexo(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };
  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  const taskId = texto(fd, "taskId");
  const id = texto(fd, "id");

  const { data: a } = await sb
    .from("task_attachments")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!a) return { erro: "Esse anexo não existe mais." };

  const { error } = await sb.from("task_attachments").delete().eq("id", id);
  if (error) return { erro: "Não foi possível remover o anexo." };
  await apagarObjeto(a.storage_path as string);

  await registrar(taskId, user.userId, [{ kind: "removeu_anexo", to: a.file_name as string }]);
  atualiza(taskId);
  return { ok: "Anexo removido." };
}
