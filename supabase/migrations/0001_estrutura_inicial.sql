-- Etapa 1 do Sistema de Orçamento: base por mês de referência, requisições (abas 1 e 2)
-- e despesa (abas 5.1 e 5). Rode no SQL Editor do Supabase do sistema, depois do 0000_ping.sql.
--
-- Ideia central: cada importação grava uma FOTO dos dados de um mês de referência (competência).
-- Importar de novo o mesmo mês substitui a foto. Mês fechado não muda mais. É isso que dá o histórico.

-- ---------------------------------------------------------------------------------------------
-- Quem usa o sistema
-- ---------------------------------------------------------------------------------------------
create table public.perfis (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  papel text not null default 'orcamento' check (papel in ('admin', 'orcamento', 'diretor')),
  -- Diretoria do diretor (cd_divisao da requisição). Usado na etapa 4.
  divisao text,
  criado_em timestamptz not null default now()
);

create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where usuario_id = auth.uid()
$$;

create or replace function public.eh_equipe_orcamento() returns boolean
language sql stable as $$ select coalesce(public.meu_papel() in ('admin', 'orcamento'), false) $$;

-- ---------------------------------------------------------------------------------------------
-- Mês de referência
-- ---------------------------------------------------------------------------------------------
create table public.competencias (
  id bigint generated always as identity primary key,
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  situacao text not null default 'aberta' check (situacao in ('aberta', 'fechada')),
  fechada_em timestamptz,
  fechada_por uuid references auth.users (id),
  -- Lote em vigor de cada fonte. Uma importação nova grava as linhas com outro lote e só troca
  -- este campo no fim (função ativar_lote), então ninguém vê dados pela metade.
  lote_requisicoes uuid,
  lote_anexo2 uuid,
  criada_em timestamptz not null default now(),
  unique (ano, mes)
);

-- ---------------------------------------------------------------------------------------------
-- Cadastro das fichas (linhas da aba 5). Muda pouco: uma vez por exercício.
-- ---------------------------------------------------------------------------------------------
create table public.fichas (
  exercicio int not null,
  ficha int not null,
  grupo text not null,            -- ex.: PROGRAMA DA ÁGUA
  acao text,                      -- ex.: 5004.1.132
  acao_nome text,                 -- ex.: Abastecimento de Água
  natureza_desc text,             -- ex.: 4.4.90.52 Equipamentos e Material Permanente
  marcador text,                  -- coluna D da aba 5 (orc, dir, caixa, superávit)
  tipo_ficha text,                -- Normal, Recurso
  fonte text,
  programa int,
  fonte_caixa text,
  categoria text,                 -- 31, 33 (custeio) ou 44 (capital)
  orcado numeric(16, 2) not null default 0,
  ordem int not null default 0,   -- ordem em que aparece no relatório
  primary key (exercicio, ficha)
);

-- ---------------------------------------------------------------------------------------------
-- Aba 1: Requisições em andamento (Sistema de Compras, Demonstrativo de Despesas)
-- ---------------------------------------------------------------------------------------------
create table public.requisicoes (
  id bigint generated always as identity primary key,
  competencia_id bigint not null references public.competencias (id) on delete cascade,
  lote uuid not null,
  nr_requisicao int, dt_ano_requisicao int, cd_funcao int, cd_sub_funcao int, cd_programa int,
  cd_proj_atividade int, nr_empenho int, dt_empenho timestamp, dt_ano_empenho int,
  cd_reduzido int,                -- = ficha
  ficha_mae int, vr_orcado numeric(16, 2), vl_acrescimo numeric(16, 2), vl_cancelado numeric(16, 2),
  cd_item_despesa int, desc_item text, nr_emp_req text, cd_divisao text, nm_divisao text, secao text,
  sub_secao text, nm_centro_custo text, cd_empresa int, cd_filial_empresa int, nm_razao_social text,
  pessoa int, vl_empenhado numeric(16, 2), vl_a_somar numeric(16, 2), vl_liquidado numeric(16, 2),
  vl_anulado numeric(16, 2), vl_pago numeric(16, 2), nm_pessoa text, natureza text, desc_natureza text,
  tipo int, vl_reserva numeric(16, 2), local_sql int
);
create index on public.requisicoes (competencia_id, lote, cd_reduzido);

-- ---------------------------------------------------------------------------------------------
-- Aba 5.1: Anexo 02 Despesa Detalhada por Natureza (Sistema de Contabilidade)
-- ---------------------------------------------------------------------------------------------
create table public.despesa_anexo2 (
  id bigint generated always as identity primary key,
  competencia_id bigint not null references public.competencias (id) on delete cascade,
  lote uuid not null,
  ficha int not null,
  vl_liquidado numeric(16, 2), vl_empenhado numeric(16, 2),
  vl_liquidado_acul numeric(16, 2), vl_empenhado_acul numeric(16, 2),
  vl_pago numeric(16, 2), vl_pago_acul numeric(16, 2),
  vl_cancelado numeric(16, 2), vl_suplementar numeric(16, 2), vl_cancelado_2 numeric(16, 2),
  funcao int, sub_funcao int, programa int, proj_atividade int, natureza_despesa text, exercicio int,
  departamento text, departamento_nome text, secretaria text, secretaria_nome text, funcao_nome text,
  programa_nome text, subfuncao_nome text, natureza_nome text, acao_nome text, projativ int,
  escrituracao text, id_altera_dotacao text, id_altera_dotacao_gestao text
);
create index on public.despesa_anexo2 (competencia_id, lote, ficha);

-- ---------------------------------------------------------------------------------------------
-- Registro de cada importação e pedidos de "Atualizar agora"
-- ---------------------------------------------------------------------------------------------
create table public.importacoes (
  id bigint generated always as identity primary key,
  competencia_id bigint not null references public.competencias (id) on delete cascade,
  origem text not null check (origem in ('requisicoes', 'despesa_anexo2', 'fichas')),
  meio text not null check (meio in ('banco', 'planilha')),
  linhas int,
  situacao text not null default 'ok' check (situacao in ('ok', 'erro')),
  mensagem text,
  realizada_em timestamptz not null default now()
);

-- O botão "Atualizar agora" grava um pedido; o sincronizador, dentro da rede do DMAE, vê o pedido
-- em até 2 minutos e importa. Assim nada de fora precisa acessar o banco interno.
create table public.pedidos_atualizacao (
  id bigint generated always as identity primary key,
  competencia_id bigint not null references public.competencias (id) on delete cascade,
  pedido_por uuid default auth.uid() references auth.users (id),
  pedido_em timestamptz not null default now(),
  atendido_em timestamptz,
  situacao text not null default 'pendente' check (situacao in ('pendente', 'ok', 'erro')),
  mensagem text
);

-- ---------------------------------------------------------------------------------------------
-- Só as linhas do lote em vigor de cada mês. As telas e os relatórios leem sempre por aqui.
-- ---------------------------------------------------------------------------------------------
create view public.vw_requisicoes with (security_invoker = true) as
select r.* from public.requisicoes r
join public.competencias c on c.id = r.competencia_id and r.lote = c.lote_requisicoes;

create view public.vw_despesa_anexo2 with (security_invoker = true) as
select d.* from public.despesa_anexo2 d
join public.competencias c on c.id = d.competencia_id and d.lote = c.lote_anexo2;

-- ---------------------------------------------------------------------------------------------
-- Aba 2: Resumo das requisições em andamento (por programa: capital, custeio)
-- ---------------------------------------------------------------------------------------------
create view public.vw_resumo_requisicoes with (security_invoker = true) as
select r.competencia_id,
       r.cd_programa as programa,
       coalesce(sum(r.vl_reserva) filter (where r.natureza like '4%'), 0) as capital,
       coalesce(sum(r.vl_reserva) filter (where r.natureza like '3%'), 0) as custeio,
       coalesce(sum(r.vl_reserva) filter (where r.natureza like '3%' or r.natureza like '4%'), 0) as total
from public.vw_requisicoes r
group by r.competencia_id, r.cd_programa;

-- ---------------------------------------------------------------------------------------------
-- Aba 5: Despesa por ficha. Suplementação (aba 3) e remanejamentos entram nas próximas etapas;
-- até lá valem zero e a fórmula do saldo já está pronta para recebê-los.
-- ---------------------------------------------------------------------------------------------
create view public.vw_despesa_ficha with (security_invoker = true) as
with req as (
  select competencia_id, cd_reduzido as ficha, sum(vl_reserva) as valor
  from public.vw_requisicoes group by 1, 2
), desp as (
  select competencia_id, ficha, sum(vl_empenhado_acul) as empenhado, sum(vl_pago_acul) as pago
  from public.vw_despesa_anexo2 group by 1, 2
)
select c.id as competencia_id, f.*,
       0::numeric(16, 2) as suplementacao,
       f.orcado + 0 as orcado_atualizado,
       coalesce(req.valor, 0) as requisicoes,
       coalesce(desp.empenhado, 0) as empenhado,
       f.orcado + 0 - coalesce(req.valor, 0) - coalesce(desp.empenhado, 0) as saldo,
       coalesce(desp.pago, 0) as pago,
       0::numeric(16, 2) as remanejar,
       f.orcado + 0 - coalesce(req.valor, 0) - coalesce(desp.empenhado, 0) + 0 as saldo_futuro
from public.competencias c
join public.fichas f on f.exercicio = c.ano
left join req on req.competencia_id = c.id and req.ficha = f.ficha
left join desp on desp.competencia_id = c.id and desp.ficha = f.ficha;

-- Situação de cada mês: quando cada fonte foi importada pela última vez
create view public.vw_situacao_competencias with (security_invoker = true) as
select c.*,
  (select max(realizada_em) from public.importacoes i where i.competencia_id = c.id and i.origem = 'requisicoes' and i.situacao = 'ok') as requisicoes_em,
  (select max(realizada_em) from public.importacoes i where i.competencia_id = c.id and i.origem = 'despesa_anexo2' and i.situacao = 'ok') as anexo2_em,
  (select count(*) from public.requisicoes r where r.competencia_id = c.id and r.lote = c.lote_requisicoes) as requisicoes_linhas,
  (select count(*) from public.despesa_anexo2 d where d.competencia_id = c.id and d.lote = c.lote_anexo2) as anexo2_linhas
from public.competencias c;

-- ---------------------------------------------------------------------------------------------
-- Regras de acesso (RLS). Gravação dos dados importados: só o sincronizador (chave de serviço,
-- que ignora RLS). Leitura: equipe do Orçamento. Diretores ganham acesso próprio na etapa 4.
-- ---------------------------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.competencias enable row level security;
alter table public.fichas enable row level security;
alter table public.requisicoes enable row level security;
alter table public.despesa_anexo2 enable row level security;
alter table public.importacoes enable row level security;
alter table public.pedidos_atualizacao enable row level security;

create policy "vê o próprio perfil" on public.perfis for select to authenticated
  using (usuario_id = auth.uid() or public.meu_papel() = 'admin');

create policy "equipe lê" on public.competencias for select to authenticated using (public.eh_equipe_orcamento());
create policy "equipe lê" on public.fichas for select to authenticated using (public.eh_equipe_orcamento());
create policy "equipe lê" on public.requisicoes for select to authenticated using (public.eh_equipe_orcamento());
create policy "equipe lê" on public.despesa_anexo2 for select to authenticated using (public.eh_equipe_orcamento());
create policy "equipe lê" on public.importacoes for select to authenticated using (public.eh_equipe_orcamento());
create policy "equipe lê" on public.pedidos_atualizacao for select to authenticated using (public.eh_equipe_orcamento());

create policy "equipe abre mês" on public.competencias for insert to authenticated
  with check (public.eh_equipe_orcamento() and situacao = 'aberta');
create policy "equipe pede atualização" on public.pedidos_atualizacao for insert to authenticated
  with check (public.eh_equipe_orcamento() and situacao = 'pendente' and pedido_por = auth.uid()
              and exists (select 1 from public.competencias c where c.id = competencia_id and c.situacao = 'aberta'));

-- Mês fechado não aceita mais dados novos, nem do sincronizador.
create or replace function public.bloquear_mes_fechado() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.competencias c
             where c.id = coalesce(new.competencia_id, old.competencia_id) and c.situacao = 'fechada') then
    raise exception 'O mês de referência está fechado e não pode ser alterado.';
  end if;
  return coalesce(new, old);
end $$;

create trigger mes_fechado before insert or update or delete on public.requisicoes
  for each row execute function public.bloquear_mes_fechado();
create trigger mes_fechado before insert or update or delete on public.despesa_anexo2
  for each row execute function public.bloquear_mes_fechado();

-- ---------------------------------------------------------------------------------------------
-- Usado só pelo sincronizador (chave de serviço): mês de referência e troca de lote.
-- ---------------------------------------------------------------------------------------------
create or replace function public.abrir_competencia(p_ano int, p_mes int) returns bigint
language sql security definer set search_path = public as $$
  insert into public.competencias (ano, mes) values (p_ano, p_mes)
  on conflict (ano, mes) do update set ano = excluded.ano
  returning id
$$;

create or replace function public.ativar_lote(p_competencia bigint, p_origem text, p_lote uuid, p_meio text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_linhas int;
begin
  if (select situacao from public.competencias where id = p_competencia) = 'fechada' then
    raise exception 'O mês de referência está fechado e não pode ser alterado.';
  end if;
  if p_origem = 'requisicoes' then
    select count(*) into v_linhas from public.requisicoes where competencia_id = p_competencia and lote = p_lote;
    update public.competencias set lote_requisicoes = p_lote where id = p_competencia;
    delete from public.requisicoes where competencia_id = p_competencia and lote <> p_lote;
  elsif p_origem = 'despesa_anexo2' then
    select count(*) into v_linhas from public.despesa_anexo2 where competencia_id = p_competencia and lote = p_lote;
    update public.competencias set lote_anexo2 = p_lote where id = p_competencia;
    delete from public.despesa_anexo2 where competencia_id = p_competencia and lote <> p_lote;
  else
    raise exception 'Origem desconhecida: %', p_origem;
  end if;
  insert into public.importacoes (competencia_id, origem, meio, linhas) values (p_competencia, p_origem, p_meio, v_linhas);
  return v_linhas;
end $$;

revoke execute on function public.abrir_competencia(int, int) from public, anon, authenticated;
revoke execute on function public.ativar_lote(bigint, text, uuid, text) from public, anon, authenticated;
grant execute on function public.abrir_competencia(int, int) to service_role;
grant execute on function public.ativar_lote(bigint, text, uuid, text) to service_role;
