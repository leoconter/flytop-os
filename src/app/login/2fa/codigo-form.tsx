"use client";

import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { cancelar, confirmar } from "./actions";

/**
 * O campo do código.
 *
 * `inputMode="numeric"` e `autoComplete="one-time-code"` são o que fazem o
 * celular abrir o teclado numérico e oferecer o código copiado — sem eles, a
 * pessoa digita seis dígitos num teclado de texto a cada login.
 */
export function CodigoForm({ fatorId, de }: { fatorId: string; de: string }) {
  return (
    <>
      <FormAcao action={confirmar} className="login-form">
        <input type="hidden" name="fatorId" value={fatorId} />
        <input type="hidden" name="de" value={de} />
        <div className="field">
          <label htmlFor="codigo">Código do autenticador</label>
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
        <BotaoAcao className="btn btn-primary btn-block" enviando="Verificando…">
          Entrar
        </BotaoAcao>
      </FormAcao>

      <FormAcao action={cancelar} silencioso>
        <BotaoAcao className="btn btn-ghost btn-sm btn-block" enviando="…">
          Sair e voltar ao login
        </BotaoAcao>
      </FormAcao>
    </>
  );
}
