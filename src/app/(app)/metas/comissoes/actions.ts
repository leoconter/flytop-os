"use server";

import { revalidatePath } from "next/cache";
import type { AcaoState } from "@/components/form-acao";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/supabase";

function revalidar() {
  revalidatePath("/metas/comissoes");
  revalidatePath("/vendedor");
}

/** "1.234,56" ou "1234.56" → 1234.56. Campo de dinheiro é digitado de vários jeitos. */
function numero(v: FormDataEntryValue | null): number | null {
  const cru = String(v ?? "").trim();
  if (!cru) return null;
  const limpo = cru.replace(/[R$\s.]/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/**
 * Grava as faixas de uma vez.
 *
 * Substitui a tabela inteira em vez de editar linha a linha: as faixas só fazem
 * sentido como conjunto — uma sozinha não diz se sobrou buraco entre ela e a
 * vizinha.
 */
export async function salvarFaixas(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  await requireAdmin();
  const sb = db();
  if (!sb) return { erro: "Banco não configurado." };

  const linhas: { min_revenue: number; max_revenue: number | null; rate: number }[] = [];

  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("de:")) continue;
    const i = chave.slice(3);

    const de = numero(valor);
    const ate = numero(formData.get(`ate:${i}`));
    const pct = numero(formData.get(`taxa:${i}`));

    // Linha em branco é a que a pessoa não preencheu — some sem reclamar.
    if (de === null && ate === null && pct === null) continue;

    if (de === null) return { erro: "Toda faixa precisa do valor inicial." };
    if (pct === null) return { erro: `Informe o percentual da faixa que começa em ${de}.` };
    if (pct < 0 || pct > 100) return { erro: "O percentual precisa estar entre 0 e 100." };
    if (ate !== null && ate <= de) {
      return { erro: `Na faixa que começa em ${de}, o "até" precisa ser maior que o "de".` };
    }

    linhas.push({ min_revenue: de, max_revenue: ate, rate: pct / 100 });
  }

  if (!linhas.length) return { erro: "Cadastre ao menos uma faixa." };

  const inicios = linhas.map((l) => l.min_revenue);
  if (new Set(inicios).size !== inicios.length) {
    return { erro: "Duas faixas começam no mesmo valor." };
  }

  // Mais de uma faixa sem teto: a segunda nunca valeria, e o silêncio disso
  // vira comissão errada no fim do mês.
  if (linhas.filter((l) => l.max_revenue === null).length > 1) {
    return { erro: "Só a última faixa pode ficar sem teto." };
  }

  const { error: erroApaga } = await sb
    .from("commission_bands")
    .delete()
    .gte("min_revenue", 0);
  if (erroApaga) return { erro: erroApaga.message };

  const { error } = await sb.from("commission_bands").insert(linhas);
  if (error) return { erro: error.message };

  revalidar();
  return {
    ok: `${linhas.length} ${linhas.length === 1 ? "faixa salva" : "faixas salvas"}.`,
  };
}
