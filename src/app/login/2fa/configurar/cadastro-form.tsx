"use client";

import Image from "next/image";
import { useState } from "react";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { cancelar, confirmar } from "../actions";

/**
 * O cadastro do autenticador.
 *
 * O segredo em texto fica escondido atrás de um botão: quem tem câmera resolve
 * com o QR, e mostrá-lo sempre põe na tela um valor que dá acesso à conta —
 * inclusive numa reunião com a tela compartilhada.
 */
export function CadastroForm({
  fatorId,
  qr,
  segredo,
  de,
}: {
  fatorId: string;
  qr: string;
  segredo: string;
  de: string;
}) {
  const [mostrarSegredo, setMostrarSegredo] = useState(false);

  return (
    <>
      <div className="qr-2fa">
        <Image src={qr} alt="QR code do autenticador" width={200} height={200} unoptimized />
      </div>

      <div className="segredo-2fa">
        {mostrarSegredo ? (
          <code>{segredo}</code>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMostrarSegredo(true)}>
            Não consigo ler o QR
          </button>
        )}
      </div>

      <FormAcao action={confirmar} className="login-form">
        <input type="hidden" name="fatorId" value={fatorId} />
        <input type="hidden" name="de" value={de} />
        <div className="field">
          <label htmlFor="codigo">Código gerado pelo app</label>
          <input
            id="codigo"
            name="codigo"
            className="input codigo-2fa"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            aria-label="Código de seis dígitos"
            autoFocus
            required
          />
        </div>
        <BotaoAcao className="btn btn-primary btn-block" enviando="Confirmando…">
          Ativar e entrar
        </BotaoAcao>
      </FormAcao>

      <FormAcao action={cancelar} silencioso>
        <input type="hidden" name="fatorId" value={fatorId} />
        <BotaoAcao className="btn btn-ghost btn-sm btn-block" enviando="…">
          Sair e voltar ao login
        </BotaoAcao>
      </FormAcao>
    </>
  );
}
