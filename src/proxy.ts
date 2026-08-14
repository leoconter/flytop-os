import { NextResponse, type NextRequest } from "next/server";

/**
 * Porteiro otimista.
 *
 * Roda em toda rota, inclusive nas que o Next pré-carrega, então só olha se
 * existe cookie de sessão — nada de banco nem de rede aqui. Quem decide de
 * verdade é o layout de `(app)`, que valida a sessão no Supabase e checa o
 * papel. Isto aqui existe para a pessoa não-logada cair no login em vez de ver
 * um esqueleto de tela antes do redirecionamento.
 */
/**
 * `/api/webhooks` fica fora do porteiro por necessidade: quem chama é a Z-API,
 * que não tem cookie de sessão e receberia um redirecionamento para o login em
 * vez de entregar o evento. Quem protege lá é o segredo no caminho, conferido
 * dentro da própria rota.
 */
const PUBLICAS = ["/login", "/api/webhooks"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const temSessao =
    request.cookies.has("ft_at") || request.cookies.has("ft_rt");

  if (!temSessao) {
    const url = new URL("/login", request.url);
    // Volta para onde a pessoa queria ir depois de entrar.
    if (pathname !== "/") url.searchParams.set("de", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Fora: estáticos, imagens e o favicon — nada deles é dado de cliente.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
