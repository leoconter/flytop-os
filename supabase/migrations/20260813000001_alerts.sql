-- Alertas de oferta.
--
-- O alerta é cadastrado aqui, fica guardado, e alguém copia o texto e cola nos
-- grupos por fora. A plataforma não dispara nada — por isso não há tabela de
-- grupos nem de destinatários: o que ela sabe é o que foi cadastrado e o que
-- alguém marcou como enviado.

create table if not exists alerts (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  origem        text not null default '',
  destino       text not null default '',
  cabine        text,
  companhia     text,
  -- "de" e "por" do anúncio; o % OFF é derivado, não guardado.
  price_from    numeric(12, 2),
  price_to      numeric(12, 2),
  installments  int,
  -- Datas como texto ISO: são uma lista de dias soltos, não um intervalo.
  ida_dates     text[] not null default '{}',
  volta_dates   text[] not null default '{}',
  -- O texto final, como foi para o grupo. Guardado inteiro de propósito: quem
  -- edita a mensagem à mão espera colar exatamente o que viu.
  message       text not null,
  -- Nulo enquanto está na fila; preenchido quando alguém marca como enviado.
  -- É o próprio carimbo que define o status, então não há como divergir.
  sent_at       timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists alerts_created_at_idx on alerts (created_at desc);
create index if not exists alerts_sent_at_idx on alerts (sent_at desc);

comment on table alerts is
  'Alertas de oferta cadastrados na plataforma. O envio aos grupos é manual: a tela copia o texto e registra quando foi enviado.';
comment on column alerts.sent_at is
  'Quando alguém marcou como enviado. Nulo = ainda na fila.';

-- Mesma postura das demais: a plataforma lê pelo servidor com a service_role,
-- e ninguém alcança a tabela pelo anon.
alter table alerts enable row level security;
