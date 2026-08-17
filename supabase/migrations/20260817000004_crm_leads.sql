-- ============================================================================
-- Interesses registrados no CRM.
--
-- Ate agora o registro de interesse vivia so na memoria do navegador: o lead
-- era digitado, aparecia na lista e sumia no primeiro F5. Nada disso chegava ao
-- banco, entao nao havia o que somar para saber qual destino e o mais pedido.
--
-- `destino_key` guarda o destino sem acento, sem pontuacao e em minusculas.
-- E o que faz "Orlando", "orlando" e "Órlando" contarem como o mesmo destino no
-- ranking, sem perder a forma que a pessoa digitou (que e o que a tela mostra).
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create table if not exists crm_leads (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text not null,
  origem      text not null,
  destino     text not null,
  -- Forma canonica do destino, calculada na aplicacao.
  destino_key text not null,
  -- Meses de interesse de viagem, como "2026-12". Um lead pode querer varios.
  meses       text[] not null default '{}',
  -- Quem registrou. `set null` porque apagar o usuario nao pode levar o lead
  -- junto: o interesse do cliente continua valendo.
  created_by  uuid references app_users(user_id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists crm_leads_destino_idx on crm_leads (destino_key);
create index if not exists crm_leads_data_idx    on crm_leads (created_at desc);

comment on table crm_leads is
  'Interesse de viagem registrado no CRM: quem e, de onde sai, para onde quer ir e quando.';
comment on column crm_leads.destino_key is
  'Destino normalizado (sem acento, minusculo). Agrupa o ranking de destinos mais pedidos.';

alter table crm_leads enable row level security;
