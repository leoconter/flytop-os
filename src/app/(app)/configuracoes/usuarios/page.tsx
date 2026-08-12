import { PageHead, SectionHead } from "@/components/dashboard/ui";
import { currentUser } from "@/lib/auth/session";
import { listSellerOptions, listUsers } from "@/lib/auth/users";
import { ListaUsuarios } from "./lista";
import { NovoUsuario } from "./novo-usuario";

export const metadata = { title: "FlyTop OS · Usuários" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const [users, sellers, eu] = await Promise.all([
    listUsers(),
    listSellerOptions(),
    currentUser(),
  ]);

  if (!users || !sellers) {
    return (
      <>
        <PageHead title="Usuários" sub="Contas de acesso à plataforma" />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            O banco ainda não respondeu. Se a migração de usuários ainda não foi
            aplicada, rode <b>20260812000001_users_and_teams.sql</b> no Supabase.
          </div>
        </div>
      </>
    );
  }

  const semVinculo = users.filter((u) => !u.sellerId && u.role !== "admin").length;
  const semAcesso = users.filter((u) => !u.active).length;

  return (
    <>
      <PageHead title="Usuários" />

      {semVinculo > 0 && (
        <div className="note-box orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <div className="nt">
            <b>{semVinculo}</b>{" "}
            {semVinculo === 1
              ? "conta de vendedor não está vinculada"
              : "contas de vendedor não estão vinculadas"}{" "}
            a ninguém no Monde. Sem o vínculo, a Tela do Vendedor não tem quais
            vendas mostrar para essas pessoas.
          </div>
        </div>
      )}

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Contas"
            sub={semAcesso > 0 ? `${semAcesso} sem acesso` : undefined}
            flush
            right={<NovoUsuario sellers={sellers} />}
          />
          <ListaUsuarios users={users} sellers={sellers} meuId={eu?.userId} />
        </div>
      </div>
    </>
  );
}
