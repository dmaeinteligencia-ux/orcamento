// Sincronizador do Sistema de Orçamento. Roda DENTRO da rede do DMAE: lê o PostgreSQL interno
// (só leitura) e envia para o Supabase. Nada de fora acessa o banco interno.
//
//   node sincronizar.mjs                  importa o mês atual uma vez
//   node sincronizar.mjs --ano 2025 --mes 8
//   node sincronizar.mjs --vigiar         fica rodando: todo dia na HORA_DIARIA e a cada pedido
//                                         do botão "Atualizar agora" (verifica a cada 2 minutos)
import './lib/env.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
import { REQUISICOES, DESPESA_ANEXO2, montarLinha } from './lib/colunas.mjs'
import { conectarSupabase, abrirCompetencia, gravarLote, registrarErro } from './lib/supabase.mjs'

const pasta = dirname(fileURLToPath(import.meta.url))
const FONTES = [
  { tabela: 'requisicoes', consulta: 'consultas/requisicoes.sql', colunas: REQUISICOES },
  { tabela: 'despesa_anexo2', consulta: 'consultas/despesa_anexo2.sql', colunas: DESPESA_ANEXO2 },
]

const log = (...a) => console.log(new Date().toLocaleString('pt-BR'), ...a)
const ultimoDia = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10)

function conectarBanco() {
  const { PG_HOST, PG_PORTA, PG_BANCO, PG_USUARIO, PG_SENHA } = process.env
  if (!PG_HOST || !PG_BANCO || !PG_USUARIO) throw new Error('Preencha PG_HOST, PG_BANCO e PG_USUARIO no .env')
  return new pg.Pool({ host: PG_HOST, port: Number(PG_PORTA || 5432), database: PG_BANCO, user: PG_USUARIO, password: PG_SENHA, max: 2 })
}

export async function sincronizarMes(banco, sb, ano, mes) {
  const competenciaId = await abrirCompetencia(sb, ano, mes)
  const resultado = []
  for (const fonte of FONTES) {
    const sql = readFileSync(join(pasta, fonte.consulta), 'utf8')
    if (sql.trimStart().startsWith('-- PENDENTE')) {
      log(`${fonte.tabela}: consulta ainda não preenchida (${fonte.consulta}), pulando.`)
      resultado.push(`${fonte.tabela}: consulta pendente`)
      continue
    }
    try {
      const { rows } = await banco.query(sql, [ano, ultimoDia(ano, mes)])
      const linhas = rows.map((r) => montarLinha(fonte.colunas, fonte.colunas.map((c) => (c ? r[c] : null))))
      const total = await gravarLote(sb, { tabela: fonte.tabela, competenciaId, linhas, meio: 'banco' })
      log(`${fonte.tabela}: ${total} linhas em ${String(mes).padStart(2, '0')}/${ano}.`)
      resultado.push(`${fonte.tabela}: ${total} linhas`)
    } catch (e) {
      log(`${fonte.tabela}: ERRO ${e.message}`)
      await registrarErro(sb, competenciaId, fonte.tabela, 'banco', e.message)
      throw e
    }
  }
  return resultado.join('; ')
}

async function atenderPedidos(banco, sb) {
  const { data: pedidos, error } = await sb.from('pedidos_atualizacao')
    .select('id, competencias(ano, mes)').eq('situacao', 'pendente').order('pedido_em')
  if (error) throw new Error(error.message)
  const feitos = new Set()
  for (const p of pedidos) {
    const { ano, mes } = p.competencias
    let situacao = 'ok'; let mensagem
    try {
      mensagem = feitos.has(`${ano}-${mes}`) ? 'atendido junto com outro pedido' : await sincronizarMes(banco, sb, ano, mes)
      feitos.add(`${ano}-${mes}`)
    } catch (e) { situacao = 'erro'; mensagem = e.message }
    await sb.from('pedidos_atualizacao').update({ situacao, mensagem, atendido_em: new Date().toISOString() }).eq('id', p.id)
  }
}

async function vigiar(banco, sb) {
  const hora = Number(process.env.HORA_DIARIA ?? 6)
  let ultimoDiaFeito = null
  log(`Vigiando: sincronização diária às ${hora}h e pedidos a cada 2 minutos.`)
  for (;;) {
    const agora = new Date()
    const hoje = agora.toISOString().slice(0, 10)
    try {
      if (agora.getHours() >= hora && ultimoDiaFeito !== hoje) {
        await sincronizarMes(banco, sb, agora.getFullYear(), agora.getMonth() + 1)
        ultimoDiaFeito = hoje
      }
      await atenderPedidos(banco, sb)
    } catch (e) {
      log('Falhou, tento de novo no próximo ciclo:', e.message)
    }
    await new Promise((r) => setTimeout(r, 2 * 60 * 1000))
  }
}

const argumentos = process.argv.slice(2)
const valor = (nome) => { const i = argumentos.indexOf(nome); return i >= 0 ? Number(argumentos[i + 1]) : undefined }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const banco = conectarBanco()
  const sb = conectarSupabase()
  if (argumentos.includes('--vigiar')) {
    await vigiar(banco, sb)
  } else {
    const hoje = new Date()
    await sincronizarMes(banco, sb, valor('--ano') ?? hoje.getFullYear(), valor('--mes') ?? hoje.getMonth() + 1)
    await banco.end()
  }
}
