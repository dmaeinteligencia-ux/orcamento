import { reactive } from 'vue'
import { listarCompetencias } from './dados'

const CHAVE = 'orcamento.competencia'
const lerSalva = () => { try { return Number(localStorage.getItem(CHAVE)) || null } catch { return null } }

// Mês de referência escolhido, compartilhado por todas as telas.
export const estado = reactive({ competencias: [], competenciaId: lerSalva(), carregando: false, erro: '' })

export const competenciaAtual = () => estado.competencias.find((c) => c.id === estado.competenciaId) ?? null

export async function carregarCompetencias() {
  estado.carregando = true
  estado.erro = ''
  try {
    estado.competencias = await listarCompetencias()
    if (!competenciaAtual()) escolherCompetencia(estado.competencias[0]?.id ?? null)
  } catch (e) {
    estado.erro = e.message
  } finally {
    estado.carregando = false
  }
}

export function escolherCompetencia(id) {
  estado.competenciaId = id
  try { localStorage.setItem(CHAVE, String(id ?? '')) } catch { /* sem armazenamento: tudo bem */ }
}
