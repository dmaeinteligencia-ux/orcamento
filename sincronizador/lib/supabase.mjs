import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

export function conectarSupabase() {
  const { SUPABASE_URL, SUPABASE_CHAVE_SERVICO } = process.env
  if (!SUPABASE_URL || !SUPABASE_CHAVE_SERVICO) throw new Error('Preencha SUPABASE_URL e SUPABASE_CHAVE_SERVICO no .env')
  return createClient(SUPABASE_URL, SUPABASE_CHAVE_SERVICO, { auth: { persistSession: false } })
}

export async function abrirCompetencia(sb, ano, mes) {
  const { data, error } = await sb.rpc('abrir_competencia', { p_ano: ano, p_mes: mes })
  if (error) throw new Error(`Não abriu o mês ${mes}/${ano}: ${error.message}`)
  return data
}

// Grava as linhas num lote novo e só no fim troca o lote em vigor (tudo ou nada para quem consulta).
export async function gravarLote(sb, { tabela, competenciaId, linhas, meio }) {
  const lote = randomUUID()
  for (let i = 0; i < linhas.length; i += 1000) {
    const parte = linhas.slice(i, i + 1000).map((l) => ({ ...l, competencia_id: competenciaId, lote }))
    const { error } = await sb.from(tabela).insert(parte)
    if (error) throw new Error(`Erro ao gravar ${tabela} (linhas ${i + 1} a ${i + parte.length}): ${error.message}`)
  }
  const { data, error } = await sb.rpc('ativar_lote', { p_competencia: competenciaId, p_origem: tabela, p_lote: lote, p_meio: meio })
  if (error) throw new Error(`Erro ao ativar ${tabela}: ${error.message}`)
  return data
}

export async function registrarErro(sb, competenciaId, origem, meio, mensagem) {
  await sb.from('importacoes').insert({ competencia_id: competenciaId, origem, meio, situacao: 'erro', mensagem: String(mensagem).slice(0, 2000) })
}
