"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { pedirEnvio, registrarAnexo, removerAnexo } from "@/app/(app)/tarefas/actions";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { tamanhoLegivel } from "@/lib/tarefas/anexos";
import type { Anexo } from "@/lib/tarefas/store";

const IconeArquivo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
const IconeRemover = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const ehImagem = (mime: string | null) => Boolean(mime?.startsWith("image/"));

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Anexos da tarefa.
 *
 * O arquivo vai do navegador direto para o Supabase, com uma URL de envio
 * assinada que o servidor entrega. Não é só elegância: a função na Vercel tem
 * teto de ~4,5 MB de corpo de requisição, e um print de reserva já chega perto
 * disso. Assim o limite passa a ser o do bucket, 20 MB.
 */
export function AnexosTarefa({ taskId, anexos }: { taskId: string; anexos: Anexo[] }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  async function enviar(arquivos: FileList | File[]) {
    setErro(null);
    for (const arquivo of Array.from(arquivos)) {
      setEnviando(arquivo.name);
      try {
        const pedido = await pedirEnvio(taskId, arquivo.name, arquivo.size);
        if (pedido.erro || !pedido.url || !pedido.path) {
          setErro(pedido.erro ?? "Não foi possível preparar o envio.");
          break;
        }

        const r = await fetch(pedido.url, {
          method: "PUT",
          body: arquivo,
          headers: arquivo.type ? { "content-type": arquivo.type } : undefined,
        });
        if (!r.ok) {
          setErro(`Falha ao enviar "${arquivo.name}".`);
          break;
        }

        const reg = await registrarAnexo(
          taskId,
          pedido.path,
          arquivo.name,
          arquivo.type,
          arquivo.size,
        );
        if (reg.erro) {
          setErro(reg.erro);
          break;
        }
      } catch {
        setErro("A rede falhou durante o envio.");
        break;
      }
    }
    setEnviando(null);
    if (entrada.current) entrada.current.value = "";
    router.refresh();
  }

  return (
    <div className="glass card">
      <div className="section-head flush">
        <span className="section-title">Anexos</span>
        {anexos.length > 0 && <span className="section-sub">{anexos.length}</span>}
      </div>

      <div
        className={`tk-solta${arrastando ? " sobre" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (e.dataTransfer.files.length) void enviar(e.dataTransfer.files);
        }}
      >
        <input
          ref={entrada}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files?.length && void enviar(e.target.files)}
        />
        {enviando ? (
          <span className="tk-enviando">Enviando {enviando}…</span>
        ) : (
          <>
            Arraste arquivos aqui ou{" "}
            <button type="button" className="tk-escolher" onClick={() => entrada.current?.click()}>
              escolha do computador
            </button>
          </>
        )}
      </div>

      {erro && (
        <p className="form-erro" role="alert" style={{ marginTop: 10 }}>
          {erro}
        </p>
      )}

      {anexos.length > 0 && (
        <div className="tk-anexos">
          {anexos.map((a) => (
            <figure key={a.id} className="tk-anexo">
              <a
                href={`/api/tarefas/anexo/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="tk-anexo-alvo"
                title={`Abrir ${a.fileName}`}
              >
                {ehImagem(a.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/tarefas/anexo/${a.id}`} alt={a.fileName} loading="lazy" />
                ) : (
                  <span className="tk-anexo-icone">
                    <IconeArquivo />
                  </span>
                )}
              </a>
              <figcaption>
                <span className="nm" title={a.fileName}>
                  {a.fileName}
                </span>
                <span className="dt">
                  {tamanhoLegivel(a.sizeBytes)}
                  {a.uploadedByName ? ` · ${a.uploadedByName.split(" ")[0]}` : ""} ·{" "}
                  {quando.format(new Date(a.createdAt))}
                </span>
              </figcaption>
              <FormAcao action={removerAnexo} silencioso className="tk-anexo-x">
                <input type="hidden" name="taskId" value={taskId} />
                <input type="hidden" name="id" value={a.id} />
                <BotaoAcao
                  className="icon-btn perigo"
                  title="Remover anexo"
                  aria-label={`Remover ${a.fileName}`}
                  enviando="…"
                >
                  <IconeRemover />
                </BotaoAcao>
              </FormAcao>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
