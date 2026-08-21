import Image from "next/image";
import { redirect } from "next/navigation";
import { iniciarCadastro, statusMfa } from "@/lib/auth/mfa";
import { authIdentity } from "@/lib/auth/session";
import { CadastroForm } from "./cadastro-form";

export const metadata = { title: "FlyTop OS · Configurar verificação" };
export const dynamic = "force-dynamic";

export default async function ConfigurarPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  if (!(await authIdentity())) redirect("/login");

  const st = await statusMfa();
  if (!st) redirect("/login");
  if (st.aal === "aal2") redirect("/");
  // Já tem autenticador: o que falta é o código, não um cadastro novo.
  if (st.temFator) redirect("/login/2fa");

  const cadastro = await iniciarCadastro();
  const de = (await searchParams).de ?? "";

  if (typeof cadastro === "string") {
    return (
      <main className="login-screen">
        <div className="login-card glass">
          <div className="login-brand">
            <Image src="/flytop-os-logo.png" alt="FlyTop OS" width={760} height={235} priority />
          </div>
          <p className="login-erro" role="alert">{cadastro}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-screen">
      <div className="login-card glass login-card-larga">
        <div className="login-brand">
          <Image src="/flytop-os-logo.png" alt="FlyTop OS" width={760} height={235} priority />
        </div>
        <p className="login-sub">Configure a verificação em duas etapas</p>
        <p className="login-hint">
          A plataforma exige um segundo fator. Aponte o app autenticador
          (Google Authenticator, Authy, 1Password) para o código abaixo e
          digite os 6 dígitos para confirmar.
        </p>

        <CadastroForm
          fatorId={cadastro.fatorId}
          qr={cadastro.qr}
          segredo={cadastro.segredo}
          de={de}
        />
      </div>
    </main>
  );
}
