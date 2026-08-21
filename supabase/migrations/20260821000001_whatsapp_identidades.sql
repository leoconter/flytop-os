-- ============================================================================
-- A ponte entre o LID e o telefone.
--
-- O WhatsApp identifica a mesma pessoa de dois jeitos, e qual deles chega
-- depende do evento -- medido nos avisos de 20 e 21/08:
--
--   GROUP_PARTICIPANT_INVITE  chega so com o telefone
--   GROUP_PARTICIPANT_LEAVE   costuma trazer o LID, e as vezes os dois
--
-- Enquanto os dois nao se encontram, a mesma pessoa vira duas linhas em
-- whatsapp_members: uma gravada pela carga (por LID) e outra criada pelo
-- webhook (por telefone). O efeito e pior que cosmetico -- quem sai do grupo
-- nao desconta ninguem, porque a saida cria linha nova em vez de fechar a que
-- ja existia, e a contagem de membros so cresce.
--
-- O payload cru guardado em whatsapp_group_events resolve isso: 83 avisos ja
-- trouxeram `participantLid` e telefone no mesmo corpo. Cada par desses e uma
-- pessoa que passa a ser reconhecivel dos dois lados.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create table if not exists whatsapp_identities (
  -- Sempre com o sufixo, como o WhatsApp manda: "240926307913962@lid".
  lid        text primary key,
  -- So digitos, com DDI -- a mesma forma de monde_customers.mobile_number.
  phone      text not null,
  -- Nome que aparece no WhatsApp, quando o aviso o traz.
  nome       text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

create index if not exists whatsapp_identities_phone_idx on whatsapp_identities (phone);

comment on table whatsapp_identities is
  'Liga o LID anonimo do WhatsApp ao telefone. Alimentada pelos avisos que trazem os dois.';
comment on column whatsapp_identities.nome is
  'Nome do perfil, so quando vem de uma saida -- em GROUP_PARTICIPANT_ADD o nome e de quem adicionou, nao de quem entrou.';

-- ----------------------------------------------------------------------------
-- Carga dos pares que ja estao guardados nos payloads
-- ----------------------------------------------------------------------------
insert into whatsapp_identities (lid, phone, nome, first_seen, last_seen)
select distinct on (e.payload->>'participantLid')
       e.payload->>'participantLid'                                   as lid,
       e.phone,
       nullif(case when e.notification = 'GROUP_PARTICIPANT_LEAVE'
                   then e.payload->>'senderName' end, 'invite')       as nome,
       min(e.received_at) over (partition by e.payload->>'participantLid'),
       max(e.received_at) over (partition by e.payload->>'participantLid')
  from whatsapp_group_events e
 where e.payload->>'participantLid' is not null
   and e.phone is not null
 order by e.payload->>'participantLid', e.received_at desc
on conflict (lid) do nothing;

alter table whatsapp_identities enable row level security;
