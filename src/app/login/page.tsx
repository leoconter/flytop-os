import Image from "next/image";
import { redirect } from "next/navigation";
import { authIdentity, currentUser } from "@/lib/auth/session";
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

  // Credencial válida sem perfil na aplicação: a pessoa entra e é devolvida
  // para cá sem entender por quê. Melhor dizer o que falta.
  const semPerfil = Boolean(await authIdentity());

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
        {semPerfil ? (
          <p className="login-erro" role="alert">
            Sua credencial é válida, mas a conta não tem perfil nesta
            plataforma. Peça a um administrador para cadastrá-la em
            Configurações · Usuários.
          </p>
        ) : (
          <LoginForm de={de.startsWith("/") ? de : ""} />
        )}
      </div>
    </main>
  );
}
