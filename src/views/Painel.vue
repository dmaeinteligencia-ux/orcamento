<script setup>
import { ref, computed, onMounted } from 'vue'
import Valor from '../components/Valor.vue'
import Carregando from '../components/Carregando.vue'
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
  { rotulo: 'Saldo das fichas', valor: soma('saldo') },
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
  <section class="painel situacao">
    <div>
      <h2>{{ comp ? rotuloCompetencia(comp) : 'Nenhum mês ainda' }}</h2>
      <p v-if="comp" class="suave">
        {{ comp.situacao === 'fechada' ? 'Mês fechado: os números não mudam mais.' : 'Mês aberto: os dados são atualizados todo dia.' }}
      </p>
    </div>
    <dl v-if="comp" class="fontes">
      <div><dt>Requisições (Compras)</dt><dd>{{ dataHora(comp.requisicoes_em) }} · {{ comp.requisicoes_linhas ?? 0 }} linhas</dd></div>
      <div><dt>Anexo 02 (Contabilidade)</dt><dd>{{ dataHora(comp.anexo2_em) }} · {{ comp.anexo2_linhas ?? 0 }} linhas</dd></div>
      <div v-if="pedido"><dt>Último pedido de atualização</dt>
        <dd>{{ dataHora(pedido.pedido_em) }} · {{ pedido.situacao === 'pendente' ? 'aguardando' : pedido.situacao }}<template v-if="pedido.situacao === 'erro'">: {{ pedido.mensagem }}</template></dd></div>
    </dl>
    <div class="acoes" v-if="!modoDemo">
      <button v-if="comp && comp.situacao === 'aberta'" class="botao" @click="atualizarAgora">ATUALIZAR AGORA</button>
      <form class="abrir-mes" @submit.prevent="abrirMes">
        <input v-model="novoMes" type="number" min="1" max="12" aria-label="Mês" />
        <input v-model="novoAno" type="number" min="2020" max="2100" aria-label="Ano" />
        <button class="botao secundario">ABRIR MÊS</button>
      </form>
    </div>
    <p v-if="aviso" class="suave">{{ aviso }}</p>
  </section>

  <Carregando v-if="comp" :carregando="carregando" :erro="erro">
    <div class="cartoes">
      <div v-for="c in cartoes" :key="c.rotulo" class="painel cartao">
        <span class="suave">{{ c.rotulo }}</span>
        <strong><Valor :v="c.valor" /></strong>
      </div>
    </div>
    <section class="painel">
      <h2>Por programa</h2>
      <p class="suave nota">Suplementação (aba 3) e remanejamentos entram nas próximas etapas. Até lá, o saldo não os considera.</p>
      <div class="tabela-rolagem">
        <table>
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
