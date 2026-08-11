# Monde → Supabase

O Monde é o ERP onde a FlyTop cadastra as vendas. A plataforma **não** consulta
o ERP a cada visita: o histórico é espelhado no Supabase e atualizado uma vez
por dia. As telas leem do banco.

## A API do Monde

```
GET https://web.monde.com.br/api/v3/sales
Authorization: Basic <token>
Content-Type: application/json      ← obrigatório; sem ele a API responde 415
```

| Item | Valor |
| --- | --- |
| Volume atual | 2.311 vendas, de 18/09/2025 em diante |
| Paginação | `page` + `size` (máx. **50**) → 47 páginas |
| Ordenação | `sale_date` **decrescente** |
| Filtros | `period_start`, `period_end` (período de **viagem**), `status` |
| Canceladas | Só aparecem com `status=canceled` explícito |
| Documentação | `GET /api/v3/documentation/file?locale=pt-BR` (OpenAPI) |

Duas consequências que moldam a sincronização:

- **Não existe filtro por data da venda.** É a ordenação decrescente que permite
  a carga diária parar nas primeiras páginas em vez de varrer as 47.
- **Venda cancelada some da listagem padrão.** Sem um passe específico em
  `status=canceled`, ela ficaria valendo no nosso banco para sempre.

O endpoint está marcado como **Beta** na documentação — por isso todo o parsing
mora num arquivo só, `supabase/functions/monde-sync/monde.ts`.

### Duas armadilhas de nomenclatura

No payload de bilhete aéreo:

- **`supplier` é a companhia aérea** (TAP Portugal, LATAM, ITA Airways) — não o
  fornecedor no sentido comercial. Vira `airline_name` no banco.
- **`representative` é a consolidadora** (Tp Air, SkyTeam, BRT Consolidadora).
  Vira `consolidator_name`.

Trocar os dois faria a tela "receita por consolidadora" mostrar companhias
aéreas.

### Preenchimento real (amostra de 100 vendas)

Um campo existir na API não significa que a equipe preencha:

| Campo | Preenchido |
| --- | --- |
| Nome do pagante, vendedor | 100% |
| `totals.revenue` (margem) | 98% |
| Localizador, consolidadora, trechos | 96% |
| Nascimento do pagante | 92% |
| **Telefone do pagante** | **83%** |
| CPF/CNPJ | 66% |
| E-mail, cidade | 63% |
| `commission_amount` no bilhete | 1% |

Duas leituras importantes:

- **O telefone chega em 83% das vendas.** Como é ele que liga a venda ao membro
  da comunidade de WhatsApp, a Jornada de Compra vai enxergar no máximo essa
  fatia. Melhorar o cadastro no Monde aumenta a cobertura direto.
- **A comissão por bilhete é praticamente vazia**, mas `totals.revenue` (margem
  da venda) vem em 98%. É esse o campo a usar para lucro — não a comissão.

## Estrutura do banco

Migração: `supabase/migrations/20260729000001_monde_sales.sql`

| Tabela | O que guarda |
| --- | --- |
| `monde_customers` | Clientes e passageiros, sem documentos nem endereço detalhado |
| `monde_sales` | Cabeçalho: data, valor, status, vendedor, **margem** (`total_revenue`) |
| `monde_sale_tickets` | Bilhete: localizador, consolidadora, comissão |
| `monde_ticket_segments` | Trechos do voo: origem, destino, companhia, horários |
| `monde_ticket_passengers` | Passageiros e números de bilhete |
| `monde_sale_payments` | Formas de pagamento, parcelas, liquidação |
| `monde_sales_raw` | Payload bruto — **contém dados sensíveis** |
| `sync_runs` | Auditoria de cada carga |

Views prontas para as telas: `v_sales_daily`, `v_sales_by_consolidator`,
`v_sales_by_airline`, `v_sales_by_route`, `v_sales_by_seller`,
`v_upcoming_flights`.

**RLS está ligada em todas as tabelas, sem policy.** O acesso é só via
`service_role`, do servidor. Nenhuma consulta parte do navegador.

## Instalação

```bash
# 1. Ligar o CLI ao projeto
supabase link --project-ref <ref-do-projeto>

# 2. Criar as tabelas
supabase db push

# 3. Guardar o token do Monde como secret da função
supabase secrets set MONDE_API_TOKEN='Basic <token>'

# 4. Publicar a função
supabase functions deploy monde-sync

# 5. Carga histórica (roda da máquina; ~47 páginas)
node scripts/monde-backfill.mjs
```

Para a carga histórica o `.env.local` precisa de `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY`.

## Agendamento diário

Roda no próprio Postgres, com `pg_cron` + `pg_net`. O token de invocação fica no
Vault, não no SQL:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<publishable-key>', 'publishable_key');

-- Diário às 05:00 UTC (02:00 em Brasília): janela recente + canceladas
select cron.schedule(
  'monde-sync-diario',
  '0 5 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/monde-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
    ),
    body := '{"mode":"daily"}'::jsonb
  );
  $$
);

-- Domingo às 06:00 UTC: passe completo, para pegar edição em venda antiga
-- que a janela de 15 dias não alcança.
select cron.schedule(
  'monde-sync-semanal',
  '0 6 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/monde-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
    ),
    body := '{"mode":"full"}'::jsonb
  );
  $$
);
```

Conferir as execuções:

```sql
select mode, status, sales_seen, sales_inserted, sales_updated, duration_ms, started_at
from sync_runs order by started_at desc limit 10;
```

## Modos da função

| Corpo | O que faz |
| --- | --- |
| `{"mode":"daily"}` | Vendas dos últimos 15 dias + todas as canceladas (padrão) |
| `{"mode":"daily","windowDays":30}` | Mesma coisa, com janela maior |
| `{"mode":"backfill","page":1}` | 5 páginas por chamada; devolve `nextPage` |
| `{"mode":"full"}` | Todas as páginas numa chamada só |
| `{"mode":"canceled"}` | Só a listagem de canceladas |

## Pendências conhecidas

- **Cabine comercial.** `monde_ticket_segments.fare_class` traz a letra do RBD
  (`"R"`), não "Executiva" / "Premium Economy" como as telas mostram. A coluna
  `cabin` existe e está vazia, esperando a tabela de conversão — `GET /cabins` é
  o primeiro lugar a checar.
- **Só o aéreo.** Na amostra inspecionada, apenas `airline_tickets` vinha
  preenchido; `hotels`, `insurances`, `travel_packages`, `car_rentals` e
  `cruises` vieram vazios. Se a FlyTop vende esses produtos, faltam tabelas e o
  faturamento fica incompleto.
- **Dados sensíveis no `monde_sales_raw`.** O payload é guardado completo (CPF,
  passaporte, endereço). Vale definir uma retenção — por exemplo, apagar o raw
  de vendas com mais de 12 meses.
- **Não vem do Monde:** metas, equipes e o mapa vendedor → equipe. Continuam
  precisando de configuração na plataforma.
