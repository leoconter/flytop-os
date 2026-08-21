-- ============================================================================
-- Funde as linhas que sao a mesma pessoa.
--
-- Com o mapa de whatsapp_identities da para ver o estrago: 66 pessoas tinham
-- duas linhas no mesmo grupo, e em 57 delas as duas discordavam -- a linha da
-- carga dizia "dentro" e a do webhook, "fora". Na pratica, 57 pessoas que
-- sairam continuavam contadas como membros.
--
-- Sobrevive a linha do webhook, identificada pelo telefone: e a que tem o
-- estado mais recente e a unica que um dia cruza com o cliente do Monde. A da
-- carga entrega o que sabe (contadores, carimbos) e sai de cena.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- 1. A linha que fica recebe o que a outra sabia.
update whatsapp_members alvo
   set lid       = coalesce(alvo.lid, velha.lid),
       entradas  = alvo.entradas + velha.entradas,
       saidas    = alvo.saidas   + velha.saidas,
       joined_at = least(alvo.joined_at, velha.joined_at),
       left_at   = greatest(alvo.left_at, velha.left_at),
       -- A carga so sabe "estava la"; o webhook viu a pessoa se mexer.
       source    = 'webhook',
       updated_at = now()
  from whatsapp_identities i
  join whatsapp_members velha on velha.lid = i.lid
 where alvo.phone = i.phone
   and alvo.group_id = velha.group_id
   and alvo.id <> velha.id;

-- 2. A linha por LID some, agora que nao guarda mais nada de exclusivo.
delete from whatsapp_members velha
 using whatsapp_identities i, whatsapp_members alvo
 where velha.lid = i.lid
   and alvo.phone = i.phone
   and alvo.group_id = velha.group_id
   and alvo.id <> velha.id;
