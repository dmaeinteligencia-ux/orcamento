// Toda leitura do sistema passa por aqui. Em modo demonstração devolve os dados de agosto/2025.
import { supabase, modoDemo } from './supabase'

const demo = {
  competencia: { id: 1, ano: 2025, mes: 8, situacao: 'aberta', requisicoes_em: '2025-09-02T09:00:00', anexo2_em: '2025-09-02T09:00:00', requisicoes_linhas: 10891, anexo2_linhas: 211 },
  fichas: () => import('../demo/despesa_fichas.json').then((m) => m.default),
  resumo: () => import('../demo/resumo_requisicoes.json').then((m) => m.default),
  anexo2: () => import('../demo/anexo2.json').then((m) => m.default),
  requisicoes: () => import('../demo/requisicoes.json').then((m) => m.default),
}

function checar({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

export async function listarCompetencias() {
  if (modoDemo) return [demo.competencia]
  return checar(await supabase.from('vw_situacao_competencias').select('*').order('ano', { ascending: false }).order('mes', { ascending: false }))
}

export async function abrirCompetencia(ano, mes) {
  if (modoDemo) throw new Error('Indisponível no modo demonstração.')
  return checar(await supabase.from('competencias').insert({ ano, mes }).select().single())
}

export async function pedirAtualizacao(competenciaId) {
  if (modoDemo) throw new Error('Indisponível no modo demonstração.')
  return checar(await supabase.from('pedidos_atualizacao').insert({ competencia_id: competenciaId }).select().single())
}

export async function ultimoPedido(competenciaId) {
  if (modoDemo) return null
  const linhas = checar(await supabase.from('pedidos_atualizacao').select('*').eq('competencia_id', competenciaId)
    .order('pedido_em', { ascending: false }).limit(1))
  return linhas[0] ?? null
}

export async function despesaPorFicha(competenciaId) {
  if (modoDemo) return demo.fichas()
  return checar(await supabase.from('vw_despesa_ficha').select('*').eq('competencia_id', competenciaId).order('ordem'))
}

export async function resumoRequisicoes(competenciaId) {
  if (modoDemo) return demo.resumo()
  return checar(await supabase.from('vw_resumo_requisicoes').select('*').eq('competencia_id', competenciaId).order('programa'))
}

export async function despesaAnexo2(competenciaId) {
  if (modoDemo) return demo.anexo2()
  return checar(await supabase.from('vw_despesa_anexo2').select('*').eq('competencia_id', competenciaId).order('ficha'))
}

// Requisições: muitas linhas (10 mil por mês), então a busca e a paginação acontecem no banco.
export async function buscarRequisicoes(competenciaId, { busca = '', soComReserva = true, pagina = 0, porPagina = 50 } = {}) {
  if (modoDemo) {
    let linhas = await demo.requisicoes()
    if (busca) {
      const b = busca.toLowerCase()
      linhas = linhas.filter((r) => [r.nr_requisicao, r.cd_reduzido, r.desc_item, r.nm_divisao, r.nm_razao_social, r.desc_natureza]
        .some((v) => String(v ?? '').toLowerCase().includes(b)))
    }
    return { linhas: linhas.slice(pagina * porPagina, (pagina + 1) * porPagina), total: linhas.length }
  }
  let q = supabase.from('vw_requisicoes').select('*', { count: 'exact' }).eq('competencia_id', competenciaId)
  if (soComReserva) q = q.neq('vl_reserva', 0)
  if (busca) {
    const b = busca.replace(/[%,()]/g, ' ').trim()
    const numero = /^\d+$/.test(b) ? `,nr_requisicao.eq.${b},cd_reduzido.eq.${b}` : ''
    q = q.or(`desc_item.ilike.%${b}%,nm_divisao.ilike.%${b}%,nm_razao_social.ilike.%${b}%,desc_natureza.ilike.%${b}%${numero}`)
  }
  const { data, error, count } = await q.order('nr_requisicao').range(pagina * porPagina, (pagina + 1) * porPagina - 1)
  if (error) throw new Error(error.message)
  return { linhas: data, total: count }
}
