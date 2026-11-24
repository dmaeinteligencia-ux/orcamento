// Colunas na mesma ordem dos relatórios exportados hoje para a planilha.
// As consultas SQL do banco interno devem devolver colunas com estes mesmos nomes.

// Aba "1 Requisições em andamento" (Compras → Relatórios → Requisições → DMAE → Demonstrativo de Despesas)
export const REQUISICOES = [
  'nr_requisicao', 'dt_ano_requisicao', 'cd_funcao', 'cd_sub_funcao', 'cd_programa', 'cd_proj_atividade',
  'nr_empenho', 'dt_empenho', 'dt_ano_empenho', 'cd_reduzido', 'ficha_mae', 'vr_orcado', 'vl_acrescimo',
  'vl_cancelado', 'cd_item_despesa', 'desc_item', 'nr_emp_req', 'cd_divisao', 'nm_divisao', 'secao',
  'sub_secao', 'nm_centro_custo', 'cd_empresa', 'cd_filial_empresa', 'nm_razao_social', 'pessoa',
  'vl_empenhado', 'vl_a_somar', 'vl_liquidado', 'vl_anulado', 'vl_pago', 'nm_pessoa', 'natureza',
  'desc_natureza', 'tipo', 'vl_reserva', 'local_sql',
]

// Aba "5.1 Desp _Anexo2" (Contabilidade → Relatórios → Orçamento → Anexos da Lei 4.320/64 → Anexo 02).
// O relatório original repete os nomes "vl_cancelado" e "nome"; aqui cada um tem nome próprio.
export const DESPESA_ANEXO2 = [
  'ficha', 'vl_liquidado', 'vl_empenhado', 'vl_liquidado_acul', 'vl_empenhado_acul', 'vl_pago',
  'vl_pago_acul', 'vl_cancelado', 'vl_suplementar', 'vl_cancelado_2', 'funcao', 'sub_funcao', 'programa',
  'proj_atividade', 'natureza_despesa', 'exercicio', 'departamento', 'departamento_nome', 'secretaria',
  'secretaria_nome', 'funcao_nome', 'programa_nome', 'subfuncao_nome', null /* natureza_despesa repetida */,
  'natureza_nome', 'acao_nome', 'projativ', 'escrituracao', 'id_altera_dotacao', 'id_altera_dotacao_gestao',
]

const TEXTO = new Set(['desc_item', 'nr_emp_req', 'cd_divisao', 'nm_divisao', 'secao', 'sub_secao',
  'nm_centro_custo', 'nm_razao_social', 'nm_pessoa', 'natureza', 'desc_natureza', 'natureza_despesa',
  'departamento', 'departamento_nome', 'secretaria', 'secretaria_nome', 'funcao_nome', 'programa_nome',
  'subfuncao_nome', 'natureza_nome', 'acao_nome', 'escrituracao', 'id_altera_dotacao', 'id_altera_dotacao_gestao'])

// Converte um valor vindo do banco ou da planilha para o tipo da coluna no Supabase.
export function normalizar(coluna, valor) {
  if (valor === undefined || valor === null || valor === '') return null
  if (valor instanceof Date) return valor.toISOString().slice(0, 19)
  if (TEXTO.has(coluna)) return String(valor).trim()
  if (typeof valor === 'object' && 'result' in valor) return normalizar(coluna, valor.result) // fórmula do Excel
  const n = Number(String(valor).replace(',', '.'))
  if (Number.isNaN(n)) return null
  return coluna.startsWith('vl_') || coluna.startsWith('vr_') ? Math.round(n * 100) / 100 : Math.trunc(n)
}

export function montarLinha(colunas, valores) {
  const linha = {}
  colunas.forEach((c, i) => { if (c) linha[c] = normalizar(c, valores[i]) })
  return linha
}
