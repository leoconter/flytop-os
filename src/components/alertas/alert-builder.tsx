"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHead } from "@/components/dashboard/ui";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { salvarAlerta } from "@/app/(app)/alertas/actions";
import { type AlertFields, buildMessage, percentOff } from "@/lib/alert-message";
import { cabines, companhias } from "@/lib/alertas-data";
import { CalendarField } from "./calendar-field";
import { WhatsAppPreview } from "./whatsapp-preview";

const VAZIO: AlertFields = {
  titulo: "",
  origem: "São Paulo",
  destino: "",
  cabine: "",
  companhia: "",
  de: "",
  por: "",
  xjuros: "",
  idaDates: [],
  voltaDates: [],
};

/** Mês corrente e o seguinte: onde o calendário abre num alerta novo. */
function mesesIniciais(): [{ y: number; m: number }, { y: number; m: number }] {
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = hoje.getMonth();
  return [
    { y, m },
    m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 },
  ];
}

/** Mantém na lista um valor gravado que saiu das opções padrão. */
function opcoes(lista: string[], atual: string): string[] {
  return atual && !lista.includes(atual) ? [atual, ...lista] : lista;
}

/**
 * Cadastro de um alerta, em tela própria.
 *
 * A mensagem acompanha os campos enquanto ninguém mexe nela; ao editar o texto
 * à mão, ele passa a mandar — senão a próxima tecla no formulário apagaria o
 * ajuste. O botão "Recriar" existe para desfazer isso.
 */
export function AlertBuilder({
  id,
  inicial,
  mensagemInicial,
}: {
  id?: string;
  inicial?: AlertFields;
  mensagemInicial?: string;
}) {
  const [fields, setFields] = useState<AlertFields>(inicial ?? VAZIO);
  const [textoManual, setTextoManual] = useState(mensagemInicial ?? "");
  // Um alerta já gravado abre com o texto que foi salvo, e não com um novo.
  const [manual, setManual] = useState(Boolean(mensagemInicial));

  const [calIda, calVolta] = mesesIniciais();

  // Derivada, não guardada: enquanto ninguém edita o texto, ele é só uma
  // leitura dos campos. Guardar em estado exigiria um efeito para mantê-los em
  // dia, e um efeito que só copia estado é onde nascem as duas versões.
  const mensagem = manual
    ? textoManual
    : fields.titulo || fields.destino
      ? buildMessage(fields)
      : "";

  function setField<K extends keyof AlertFields>(key: K, value: AlertFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  const { titulo, origem, destino, cabine, companhia, de, por, xjuros, idaDates, voltaDates } =
    fields;

  return (
    <FormAcao action={salvarAlerta} className="grid-2 split">
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="idaDates" value={JSON.stringify(idaDates)} />
      <input type="hidden" name="voltaDates" value={JSON.stringify(voltaDates)} />

      <div className="glass card">
        <SectionHead title="Dados da oferta" sub="montam a mensagem" flush />
        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="field full">
            <label htmlFor="al-titulo">Título</label>
            <input
              id="al-titulo"
              className="input"
              name="titulo"
              value={titulo}
              onChange={(e) => setField("titulo", e.target.value)}
              placeholder="✈️ BAIXOU! LISBOA NA EXECUTIVA COM 38% OFF!"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="al-origem">Origem</label>
            <input
              id="al-origem"
              className="input"
              name="origem"
              value={origem}
              onChange={(e) => setField("origem", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="al-destino">Destino</label>
            <input
              id="al-destino"
              className="input"
              name="destino"
              value={destino}
              onChange={(e) => setField("destino", e.target.value)}
              placeholder="Lisboa 🇵🇹"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="al-cabine">Cabine</label>
            <select
              id="al-cabine"
              className="select"
              name="cabine"
              value={cabine}
              onChange={(e) => setField("cabine", e.target.value)}
            >
              <option value="">Selecione</option>
              {opcoes(cabines, cabine).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="al-companhia">Companhia</label>
            <select
              id="al-companhia"
              className="select"
              name="companhia"
              value={companhia}
              onChange={(e) => setField("companhia", e.target.value)}
            >
              <option value="">Selecione</option>
              {opcoes(companhias, companhia).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="al-de">De (R$)</label>
            <input
              id="al-de"
              className="input"
              name="de"
              inputMode="numeric"
              value={de}
              onChange={(e) => setField("de", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="al-por">Por (R$)</label>
            <input
              id="al-por"
              className="input"
              name="por"
              inputMode="numeric"
              value={por}
              onChange={(e) => setField("por", e.target.value)}
            />
          </div>

          <div className="field">
            <label>% OFF (automático)</label>
            <div className="readonly-field">{percentOff(de, por)}</div>
          </div>
          <div className="field">
            <label htmlFor="al-juros">Vezes sem juros</label>
            <input
              id="al-juros"
              className="input"
              name="xjuros"
              inputMode="numeric"
              value={xjuros}
              onChange={(e) => setField("xjuros", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Datas de ida</label>
            <CalendarField
              value={idaDates}
              onChange={(v) => setField("idaDates", v)}
              fallback={calIda}
              placeholder="Selecionar datas de ida"
            />
          </div>
          <div className="field">
            <label>Datas de volta</label>
            <CalendarField
              value={voltaDates}
              onChange={(v) => setField("voltaDates", v)}
              fallback={calVolta}
              accent="green"
              placeholder="Selecionar datas de volta"
            />
          </div>

          <div className="field full">
            <label htmlFor="al-msg">Mensagem</label>
            <textarea
              id="al-msg"
              className="textarea"
              name="mensagem"
              value={mensagem}
              onChange={(e) => {
                setManual(true);
                setTextoManual(e.target.value);
              }}
              placeholder="Preencha os campos acima — a mensagem se monta sozinha."
            />
            {manual ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: "flex-start" }}
                onClick={() => setManual(false)}
              >
                Recriar a partir dos campos
              </button>
            ) : (
              <span className="metric-hint">
                acompanha os campos; se editar aqui, o texto passa a ser o seu
              </span>
            )}
          </div>

          <div className="field full acoes-edicao">
            <BotaoAcao>{id ? "Salvar alterações" : "Salvar no banco de alertas"}</BotaoAcao>
            <Link href="/alertas" className="btn btn-ghost">
              Cancelar
            </Link>
          </div>
        </div>
      </div>

      <div className="glass card" style={{ alignSelf: "start" }}>
        <SectionHead title="Pré-visualização" sub="como chega no grupo" flush />
        <div style={{ marginTop: 14 }}>
          <WhatsAppPreview message={mensagem} />
        </div>
      </div>
    </FormAcao>
  );
}
