import { ScreenPlaceholder } from "@/components/app-shell/screen-placeholder";

export const metadata = { title: "FlyTop OS · Jornada de Compra" };

export default function JornadaPage() {
  return (
    <ScreenPlaceholder
      eyebrow="Inteligência · comunidade → venda"
      title="Jornada de Compra"
      sub={
        <>
          Tempo entre <b>entrar na comunidade</b> e <b>realizar a compra</b>
        </>
      }
    />
  );
}
