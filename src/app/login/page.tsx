import Image from "next/image";
import { redirect } from "next/navigation";
import { currentUser, statusConta } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "FlyTop OS · Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  // Quem já está dentro não vê tela de login.
  if (await currentUser()) redirect("/");

  // Credencial válida que mesmo assim não entra: a pessoa é devolvida para cá
  // sem entender por quê. Cada caso tem um recado diferente.
  const bloqueio = await statusConta();

  const de = (await searchParams).de ?? "";

  return (
    <main className="login-screen">
      <div className="login-card glass">
        <div className="login-brand">
          <Image
            src="/flytop-os-logo.png"
            alt="FlyTop OS"
            width={760}
            height={235}
            priority
          />
        </div>
        <p className="login-sub">Plataforma interna de operações</p>
        {bloqueio === "desativado" ? (
          <p className="login-erro" role="alert">
            Seu acesso está desativado. Os dados da conta continuam guardados —
            fale com um administrador para reativá-la.
          </p>
        ) : bloqueio === "sem-perfil" ? (
          <p className="login-erro" role="alert">
            Sua credencial é válida, mas a conta ainda não foi cadastrada nesta
            plataforma. Peça a um administrador para criá-la em Configurações ·
            Usuários.
          </p>
        ) : (
          <LoginForm de={de.startsWith("/") ? de : ""} />
        )}
      </div>
    </main>
  );
}
