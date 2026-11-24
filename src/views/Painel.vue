<script setup>
import { ref, computed, onMounted } from 'vue'
import Valor from '../components/Valor.vue'
import Carregando from '../components/Carregando.vue'
import Cabecalho from '../components/Cabecalho.vue'
import { estado, competenciaAtual, carregarCompetencias, escolherCompetencia } from '../lib/estado'
import { despesaPorFicha, pedirAtualizacao, ultimoPedido, abrirCompetencia } from '../lib/dados'
import { modoDemo } from '../lib/supabase'
import { rotuloCompetencia, dataHora } from '../lib/formato'

const fichas = ref([])
const carregando = ref(false)
const erro = ref('')
const pedido = ref(null)
const aviso = ref('')
const hoje = new Date()
const novoAno = ref(hoje.getFullYear())
const novoMes = ref(hoje.getMonth() + 1)

const comp = computed(competenciaAtual)
const soma = (campo, filtro = () => true) => fichas.value.filter(filtro).reduce((t, f) => t + Number(f[campo] || 0), 0)
const cartoes = computed(() => [
  { rotulo: 'Orçado atualizado', valor: soma('orcado_atualizado') },
  { rotulo: 'Requisições em andamento', valor: soma('requisicoes') },
  { rotulo: 'Empenhado', valor: soma('empenhado') },
  { rotulo: 'Pago', valor: soma('pago') },
  { rotulo: 'Saldo das fichas', valor: soma('saldo'), detalhe: `${fichas.value.filter((f) => Number(f.saldo) < 0).length} fichas negativas`, alerta: soma('saldo') < 0 },
])
const programas = computed(() => {
  const grupos = new Map()
  for (const f of fichas.value) {
    const g = grupos.get(f.grupo) ?? { grupo: f.grupo, orcado: 0, requisicoes: 0, empenhado: 0, pago: 0, saldo: 0 }
    for (const c of ['orcado_atualizado', 'requisicoes', 'empenhado', 'pago', 'saldo']) g[c === 'orcado_atualizado' ? 'orcado' : c] += Number(f[c] || 0)
    grupos.set(f.grupo, g)
  }
  return [...grupos.values()]
})

async function carregar() {
  if (!estado.competenciaId) return
  carregando.value = true
  erro.value = ''
  try {
    ;[fichas.value, pedido.value] = await Promise.all([despesaPorFicha(estado.competenciaId), ultimoPedido(estado.competenciaId)])
  } catch (e) { erro.value = e.message } finally { carregando.value = false }
}

async function atualizarAgora() {
  aviso.value = ''
  try {
    pedido.value = await pedirAtualizacao(estado.competenciaId)
    aviso.value = 'Pedido enviado. O sincronizador do DMAE busca os dados em até 2 minutos.'
  } catch (e) { aviso.value = e.message }
}

async function abrirMes() {
  aviso.value = ''
  try {
    const c = await abrirCompetencia(Number(novoAno.value), Number(novoMes.value))
    await carregarCompetencias()
    escolherCompetencia(c.id)
    await pedirAtualizacao(c.id)
    aviso.value = `Mês ${rotuloCompetencia(c)} aberto e atualização pedida.`
  } catch (e) {
    aviso.value = /duplicate|unique/i.test(e.message) ? 'Esse mês já existe: escolha-o no seletor acima.' : e.message
  }
}

onMounted(carregar)
</script>

<template>
  <Cabecalho :titulo="comp ? `Painel · ${rotuloCompetencia(comp)}` : 'Painel'"
    :subtitulo="comp ? (comp.situacao === 'fechada' ? 'Mês fechado: os números não mudam mais.' : 'Mês aberto: os dados são atualizados todo dia.') : 'Nenhum mês importado ainda.'">
    <template #acoes>
      <template v-if="!modoDemo">
        <form class="acoes" @submit.prevent="abrirMes">
          <input v-model="novoMes" class="campo" style="width: 5rem" type="number" min="1" max="12" aria-label="Mês" />
          <input v-model="novoAno" class="campo" style="width: 6rem" type="number" min="2020" max="2100" aria-label="Ano" />
          <button class="botao secundario pequeno">Abrir mês</button>
        </form>
        <button v-if="comp && comp.situacao === 'aberta'" class="botao pequeno" @click="atualizarAgora">Atualizar agora</button>
      </template>
    </template>
  </Cabecalho>
  <div v-if="aviso" class="aviso"><span class="icone">i</span><b>Atualização</b><span>{{ aviso }}</span></div>

  <template v-if="comp">
    <section class="cartao">
      <div class="cartao-topo">
        <b class="cartao-titulo">Situação das importações</b>
        <span class="selo" :class="comp.situacao === 'fechada' ? 'fechado' : 'aberto'">{{ comp.situacao === 'fechada' ? 'Fechado' : 'Aberto' }}</span>
      </div>
      <dl class="fontes cartao-corpo">
        <div><dt class="rotulo-caps">Requisições · Compras</dt><dd>{{ dataHora(comp.requisicoes_em) }} · {{ comp.requisicoes_linhas ?? 0 }} linhas</dd></div>
        <div><dt class="rotulo-caps">Anexo 02 · Contabilidade</dt><dd>{{ dataHora(comp.anexo2_em) }} · {{ comp.anexo2_linhas ?? 0 }} linhas</dd></div>
        <div v-if="pedido"><dt class="rotulo-caps">Último pedido de atualização</dt>
          <dd>{{ dataHora(pedido.pedido_em) }} <span class="selo" :class="pedido.situacao">{{ pedido.situacao === 'pendente' ? 'aguardando' : pedido.situacao }}</span>
            <span v-if="pedido.situacao === 'erro'" class="erro">{{ pedido.mensagem }}</span></dd></div>
      </dl>
    </section>

    <Carregando :carregando="carregando" :erro="erro">
      <div class="kpis">
        <div v-for="c in cartoes" :key="c.rotulo" class="cartao kpi" :class="{ alerta: c.alerta }">
          <span class="rotulo">{{ c.rotulo }}</span>
          <span class="valor"><Valor :v="c.valor" /></span>
          <span v-if="c.detalhe" class="detalhe">{{ c.detalhe }}</span>
        </div>
      </div>
      <section class="cartao">
        <div class="cartao-topo">
          <b class="cartao-titulo">Por programa</b>
          <span class="cartao-nota">Saldo ainda sem suplementação e remanejamentos (etapa 2)</span>
        </div>
        <div class="tabela-rolagem">
          <table class="lista">
            <thead><tr><th>Programa</th><th>Orçado</th><th>Requisições</th><th>Empenhado</th><th>Pago</th><th>Saldo</th></tr></thead>
            <tbody>
              <tr v-for="p in programas" :key="p.grupo">
                <td>{{ p.grupo }}</td><td><Valor :v="p.orcado" /></td><td><Valor :v="p.requisicoes" /></td>
                <td><Valor :v="p.empenhado" /></td><td><Valor :v="p.pago" /></td><td><Valor :v="p.saldo" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </Carregando>
  </template>
</template>
