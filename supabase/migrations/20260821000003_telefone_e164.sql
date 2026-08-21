-- ============================================================================
-- Telefone do cliente numa forma so, para cruzar com a comunidade.
--
-- O WhatsApp entrega sempre DDI+DDD+numero ("5511992710106"). O Monde guarda o
-- que a pessoa digitou, e o que ela digitou varia:
--
--   1.171 com 11 digitos   "04199268282"    zero antigo na frente, sem DDI
--     649 com 13 digitos   "5511911766430"  ja no formato certo
--     162 com 12 digitos   "011981609899"   zero + DDD + 9 digitos
--      69 com 10 digitos   "1121644300"     fixo, sem DDI
--
-- Resultado: de 1.740 telefones da comunidade, so 5 encontravam o cliente. Nao
-- e que os clientes nao estejam nos grupos -- e que os dois lados escrevem o
-- mesmo numero de jeitos diferentes.
--
-- `mobile_e164` guarda a forma canonica. A coluna original fica como veio: ela
-- e o que o Monde tem, e reescreve-la apagaria a evidencia de como o cadastro
-- foi feito.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create or replace function normalizar_telefone_br(bruto text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if bruto is null then return null; end if;

  -- So digitos.
  d := regexp_replace(bruto, '\D', '', 'g');
  if d = '' then return null; end if;

  -- Zero de operadora na frente ("011...", "04199...").
  d := regexp_replace(d, '^0+', '');

  -- Ja vem com DDI do Brasil e tamanho coerente.
  if left(d, 2) = '55' and length(d) between 12 and 13 then
    return d;
  end if;

  -- Nacional: DDD + numero. 10 = fixo ou celular antigo, 11 = celular com o 9.
  if length(d) in (10, 11) then
    return '55' || d;
  end if;

  -- Numero de outro pais ja em formato internacional.
  if length(d) between 11 and 15 then
    return d;
  end if;

  -- Curto demais para ser telefone (ramal, data digitada no campo errado).
  return null;
end;
$$;

comment on function normalizar_telefone_br is
  'Telefone em DDI+DDD+numero, so digitos. Tira o zero de operadora e completa o 55 quando falta.';

alter table monde_customers add column if not exists mobile_e164 text;

update monde_customers
   set mobile_e164 = normalizar_telefone_br(mobile_number)
 where mobile_number is not null and mobile_number <> '';

create index if not exists monde_customers_e164_idx on monde_customers (mobile_e164);

comment on column monde_customers.mobile_e164 is
  'mobile_number na forma canonica. E por aqui que o cliente encontra o membro da comunidade.';
