/**
 * Anexos das tarefas.
 *
 * O arquivo nunca passa pelo nosso servidor: pedimos ao Supabase uma URL de
 * envio assinada, o navegador manda o arquivo direto para lá, e só então a
 * linha é gravada. Dois motivos — a função na Vercel tem teto de ~4,5 MB de
 * corpo de requisição, e assim nenhum byte de anexo ocupa a memória dela.
 *
 * A URL assinada vale para um caminho só e expira; não é a chave do projeto
 * indo ao navegador.
 */
import { db } from "@/lib/supabase";

export const BUCKET = "task-attachments";
/** Teto do bucket no Supabase. Conferido aqui também, para o recado ser claro. */
export const TAMANHO_MAX = 20 * 1024 * 1024;

/** Nome seguro para virar caminho: sem acento, sem espaço, sem barra. */
export function nomeDeArquivo(original: string): string {
  const limpo = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
  return limpo || "arquivo";
}

/** Caminho do objeto. O id aleatório evita colisão de nomes iguais. */
export function caminho(taskId: string, fileName: string): string {
  return `${taskId}/${crypto.randomUUID()}-${nomeDeArquivo(fileName)}`;
}

export interface Envio {
  path: string;
  /** URL completa para o PUT do navegador. */
  url: string;
  token: string;
}

export async function urlDeEnvio(taskId: string, fileName: string): Promise<Envio | null> {
  const sb = db();
  if (!sb) return null;

  const path = caminho(taskId, fileName);
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[tarefas] url de envio:", error?.message);
    return null;
  }
  return {
    path,
    token: data.token,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${data.token}`,
  };
}

/** URL temporária de leitura. O bucket é privado: sem isto, ninguém baixa. */
export async function urlDeLeitura(path: string, segundos = 60): Promise<string | null> {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, segundos);
  if (error || !data) {
    console.error("[tarefas] url de leitura:", error?.message);
    return null;
  }
  return data.signedUrl;
}

export async function apagarObjeto(path: string): Promise<void> {
  const sb = db();
  if (!sb) return;
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) console.error("[tarefas] apagar objeto:", error.message);
}

/** "1,4 MB" */
export function tamanhoLegivel(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
