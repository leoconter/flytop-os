"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { moverTarefa } from "@/app/(app)/tarefas/actions";
import { ETAPA_LABEL, ETAPA_TOM, ETAPAS, type Etapa } from "@/lib/tarefas/modelo";
import type { Tarefa } from "@/lib/tarefas/store";
import { descrever, regraDe } from "@/lib/tarefas/recorrencia";
import { Avatar, Bandeira, Modal, Repete } from "./etiquetas";

const IconeComentario = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
  </svg>
);
const IconeAnexo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.2-9.19a3.67 3.67 0 1 1 5.18 5.18l-9.2 9.2a1.83 1.83 0 0 1-2.59-2.6l8.5-8.49" />
  </svg>
);
const IconeChecklist = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 11l2 2 4-4" />
    <rect x="3" y="4" width="18" height="17" rx="2" />
  </svg>
);

function Cartao({ t, arrastando }: { t: Tarefa; arrastando: boolean }) {
  return (
    <article className={`tk-cartao${arrastando ? " pegando" : ""}`}>
      <div className="tk-topo">
        <Bandeira prioridade={t.priority} />
        <Link href={`/tarefas/${t.id}`} className="tk-titulo">
          {t.title}
        </Link>
      </div>
      <div className="tk-meta">
        <Modal modalidade={t.modality} />
        {t.locator && <span className="tk-loc">{t.locator}</span>}
        <Repete texto={descrever(regraDe(t))} />
      </div>
      <div className="tk-rodape">
        <span className="tk-sinais">
          <span className="tk-seq">#{t.seq}</span>
          {t.checklistTotal > 0 && (
            <span title="Checklist">
              <IconeChecklist />
              {t.checklistFeitos}/{t.checklistTotal}
            </span>
          )}
          {t.comentarios > 0 && (
            <span title="Comentários">
              <IconeComentario />
              {t.comentarios}
            </span>
          )}
          {t.anexos > 0 && (
            <span title="Anexos">
              <IconeAnexo />
              {t.anexos}
            </span>
          )}
        </span>
        <Avatar nome={t.assigneeName} />
      </div>
    </article>
  );
}

/**
 * Quadro por etapa, com arrastar entre colunas.
 *
 * Usa o arrastar nativo do navegador em vez de biblioteca: o gesto é simples
 * (um cartão, quatro colunas) e não vale trazer uma dependência para isso.
 * O cartão vai para a posição onde foi solto — a lista local muda na hora e o
 * servidor recebe depois, para o quadro não travar esperando a resposta.
 */
export function Quadro({ tarefas }: { tarefas: Tarefa[] }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [local, setLocal] = useState(tarefas);
  const [pegando, setPegando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<{ etapa: Etapa; indice: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Quem está sendo arrastado também vai num ref, não só no estado: entre o
  // `dragstart` e o `drop` o React ainda pode não ter reprocessado, e aí o
  // cartão seria solto sem que soubéssemos qual era. O estado continua, mas só
  // para deixar o cartão translúcido.
  const pegandoRef = useRef<string | null>(null);

  // A lista do servidor manda: se ela mudou (outra pessoa mexeu, ou o filtro
  // mudou), o estado local é descartado.
  const [vistas, setVistas] = useState(tarefas);
  if (vistas !== tarefas) {
    setVistas(tarefas);
    setLocal(tarefas);
  }

  const porEtapa = (e: Etapa) =>
    local.filter((t) => t.status === e).sort((a, b) => a.position - b.position);

  function soltar(etapa: Etapa, indice: number) {
    const id = pegandoRef.current;
    pegandoRef.current = null;
    setPegando(null);
    setAlvo(null);
    if (!id) return;

    const coluna = porEtapa(etapa).filter((t) => t.id !== id);
    const anterior = indice > 0 ? coluna[indice - 1]?.position ?? null : null;
    const proxima = coluna[indice]?.position ?? null;
    const nova =
      anterior === null && proxima === null
        ? 0
        : anterior === null
          ? proxima! - 1
          : proxima === null
            ? anterior + 1
            : (anterior + proxima) / 2;

    setLocal((atual) =>
      atual.map((t) => (t.id === id ? { ...t, status: etapa, position: nova } : t)),
    );

    iniciar(async () => {
      const r = await moverTarefa(id, etapa, proxima, anterior);
      if (r.erro) {
        setErro(r.erro);
        setLocal(tarefas); // devolve o cartão para onde estava
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      {erro && (
        <p className="form-erro" role="alert" style={{ marginBottom: 12 }}>
          {erro}
        </p>
      )}
      <div className="tk-quadro">
        {ETAPAS.map((etapa) => {
          const coluna = porEtapa(etapa);
          return (
            <section
              key={etapa}
              className={`tk-coluna ${ETAPA_TOM[etapa]}${alvo?.etapa === etapa ? " sobre" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (alvo?.etapa !== etapa || alvo?.indice !== coluna.length) {
                  setAlvo({ etapa, indice: coluna.length });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                pegandoRef.current ||= e.dataTransfer.getData("text/plain") || null;
                soltar(etapa, alvo?.etapa === etapa ? alvo.indice : coluna.length);
              }}
            >
              <header className="tk-coluna-topo">
                <span className="tk-coluna-nome">{ETAPA_LABEL[etapa]}</span>
                <span className="tk-coluna-qt">{coluna.length}</span>
              </header>

              <div className="tk-pilha">
                {coluna.map((t, i) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      pegandoRef.current = t.id;
                      setPegando(t.id);
                      // O id também no dataTransfer: é o canal padrão do
                      // arrastar do HTML e sobrevive a remontagem.
                      e.dataTransfer.setData("text/plain", t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      pegandoRef.current = null;
                      setPegando(null);
                      setAlvo(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      const acima = e.clientY < r.top + r.height / 2;
                      const indice = acima ? i : i + 1;
                      if (alvo?.etapa !== etapa || alvo?.indice !== indice) {
                        setAlvo({ etapa, indice });
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pegandoRef.current ||= e.dataTransfer.getData("text/plain") || null;
                      soltar(etapa, alvo?.etapa === etapa ? alvo.indice : i);
                    }}
                  >
                    {alvo?.etapa === etapa && alvo.indice === i && <div className="tk-marca" />}
                    <Cartao t={t} arrastando={pegando === t.id} />
                  </div>
                ))}
                {alvo?.etapa === etapa && alvo.indice === coluna.length && (
                  <div className="tk-marca" />
                )}
                {coluna.length === 0 && <p className="tk-vazia">Nada aqui</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
