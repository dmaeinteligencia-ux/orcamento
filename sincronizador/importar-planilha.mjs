// Importa as abas "1 Requisições em andamento" e "5.1 Desp _Anexo2" de uma planilha de Orçamento
// já preenchida. Serve para carregar o histórico dos meses passados e para testar o sistema
// antes de as consultas do banco interno estarem prontas.
//
//   node importar-planilha.mjs "Passo a passo - Orçamento.xlsx" --ano 2025 --mes 8
import './lib/env.mjs'
import ExcelJS from 'exceljs'
import { REQUISICOES, DESPESA_ANEXO2, montarLinha } from './lib/colunas.mjs'
import { conectarSupabase, abrirCompetencia, gravarLote } from './lib/supabase.mjs'

const ABAS = [
  { tabela: 'requisicoes', aba: /^\s*1\s+Requisi/i, colunas: REQUISICOES, chave: 'cd_reduzido' },
  { tabela: 'despesa_anexo2', aba: /^\s*5\.1\s/i, colunas: DESPESA_ANEXO2, chave: 'ficha' },
]

export async function lerPlanilha(arquivo) {
  const livro = new ExcelJS.Workbook()
  await livro.xlsx.readFile(arquivo)
  const dados = {}
  for (const { tabela, aba, colunas, chave } of ABAS) {
    const planilha = livro.worksheets.find((w) => aba.test(w.name))
    if (!planilha) throw new Error(`Aba não encontrada para ${tabela}`)
    const linhas = []
    planilha.eachRow((row, n) => {
      if (n === 1) return // cabeçalho
      const valores = colunas.map((_, i) => row.getCell(i + 1).value)
      const linha = montarLinha(colunas, valores)
      if (linha[chave] != null) linhas.push(linha)
    })
    dados[tabela] = linhas
  }
  return dados
}

const args = process.argv.slice(2)
const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? Number(args[i + 1]) : undefined }

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('importar-planilha.mjs')) {
  const arquivo = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a))
  const ano = valor('--ano'); const mes = valor('--mes')
  if (!arquivo || !ano || !mes) {
    console.error('Uso: node importar-planilha.mjs "arquivo.xlsx" --ano 2025 --mes 8')
    process.exit(1)
  }
  const dados = await lerPlanilha(arquivo)
  const sb = conectarSupabase()
  const competenciaId = await abrirCompetencia(sb, ano, mes)
  for (const [tabela, linhas] of Object.entries(dados)) {
    const total = await gravarLote(sb, { tabela, competenciaId, linhas, meio: 'planilha' })
    console.log(`${tabela}: ${total} linhas em ${String(mes).padStart(2, '0')}/${ano}`)
  }
}
