import Image from "next/image";
import { redirect } from "next/navigation";
import { statusMfa } from "@/lib/auth/mfa";
import { authIdentity } from "@/lib/auth/session";
import { CodigoForm } from "./codigo-form";

export const metadata = { title: "FlyTop OS · Verificação em duas etapas" };
export const dynamic = "force-dynamic";

export default async function DoisFatoresPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  // Sem senha conferida não há o que verificar: volta ao começo.
  if (!(await authIdentity())) redirect("/login");

  const st = await statusMfa();
  if (!st) redirect("/login");
  // Já verificado nesta sessão — nada a fazer aqui.
  if (st.aal === "aal2") redirect("/");
  // Ainda não tem autenticador: o caminho é cadastrar, não digitar código.
  if (!st.temFator) redirect("/login/2fa/configurar");

  const de = (await searchParams).de ?? "";

  return (
    <main className="login-screen">
      <div className="login-card glass">
        <div className="login-brand">
          <Image src="/flytop-os-logo.png" alt="FlyTop OS" width={760} height={235} priority />
        </div>
        <p className="login-sub">Verificação em duas etapas</p>
        <p className="login-hint">
          Abra o app autenticador e digite o código de 6 dígitos que aparece
          para o FlyTop OS.
        </p>

        <CodigoForm fatorId={st.fatorId!} de={de} />
      </div>
    </main>
  );
}
