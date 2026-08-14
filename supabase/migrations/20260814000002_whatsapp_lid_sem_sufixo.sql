-- ============================================================================
-- Corrige os LIDs que entraram na coluna de telefone.
--
-- Os avisos do webhook trazem o LID sem o sufixo "@lid" -- "171171710501073"
-- em vez de "171171710501073@lid". Sem o sufixo, o codigo os tomou por
-- telefone. Eram quatro linhas, dos primeiros eventos reais recebidos.
--
-- A regra passou a ser o tamanho: telefone tem no maximo 13 digitos (medido
-- nos 80 mil participantes carregados), LID tem 14 ou mais.
--
-- Nao basta converter: a mesma pessoa costuma ja existir sob a forma com
-- sufixo, gravada pela carga inicial. Sao duas linhas para uma pessoa so, e
-- converter uma na outra esbarra na unique. Por isso as duas sao fundidas
-- antes, e a linha do evento -- que sabe o que aconteceu -- manda no estado.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Membros: funde a linha do evento na linha da carga
-- ----------------------------------------------------------------------------
update whatsapp_members alvo
   set status    = crua.status,
       joined_at = coalesce(crua.joined_at, alvo.joined_at),
       left_at   = coalesce(crua.left_at,   alvo.left_at),
       -- A carga entra com zero de proposito, entao somar preserva o que o
       -- webhook ja tinha contado.
       entradas  = alvo.entradas + crua.entradas,
       saidas    = alvo.saidas   + crua.saidas,
       source    = 'webhook',
       updated_at = now()
  from whatsapp_members crua
 where crua.phone is not null
   and length(crua.phone) > 13
   and alvo.group_id   = crua.group_id
   and alvo.member_key = crua.phone || '@lid';

delete from whatsapp_members crua
 where crua.phone is not null
   and length(crua.phone) > 13
   and exists (
     select 1 from whatsapp_members alvo
      where alvo.group_id   = crua.group_id
        and alvo.member_key = crua.phone || '@lid'
   );

-- Quem nao tinha par na carga so muda de coluna.
update whatsapp_members
   set lid        = phone || '@lid',
       member_key = phone || '@lid',
       phone      = null
 where phone is not null
   and length(phone) > 13;

-- ----------------------------------------------------------------------------
-- Log: append-only, sem unique por pessoa -- conversao direta
-- ----------------------------------------------------------------------------
update whatsapp_group_events
   set lid        = phone || '@lid',
       member_key = phone || '@lid',
       phone      = null
 where phone is not null
   and length(phone) > 13;

update whatsapp_group_events
   set actor_lid   = actor_phone || '@lid',
       actor_phone = null
 where actor_phone is not null
   and length(actor_phone) > 13;
