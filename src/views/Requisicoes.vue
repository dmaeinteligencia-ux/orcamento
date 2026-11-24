<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Valor from '../components/Valor.vue'
import Carregando from '../components/Carregando.vue'
import { estado } from '../lib/estado'
import { resumoRequisicoes, buscarRequisicoes } from '../lib/dados'
import { modoDemo } from '../lib/supabase'

const NOMES = { 7001: 'Administração', 7003: 'Publicidade', 5001: 'Resíduos Sólidos', 5004: 'Água e Esgoto', 5005: 'Drenagem Pluvial', 9001: 'Dívida Interna' }
const ORDEM = [7001, 7003, 5001, 5004, 5005, 9001]

const resumo = ref([])
const linhas = ref([])
const total = ref(0)
const busca = ref('')
const soComReserva = ref(true)
const pagina = ref(0)
const POR_PAGINA = 50
const carregando = ref(false)
const erro = ref('')

const resumoOrdenado = computed(() => ORDEM.map((p) => resumo.value.find((r) => r.programa === p) ?? { programa: p, capital: 0, custeio: 0, total: 0 }))
const somaResumo = (c) => resumo.value.reduce((t, r) => t + Number(r[c] || 0), 0)
const paginas = computed(() => Math.max(1, Math.ceil(total.value / POR_PAGINA)))

async function carregarLista() {
  carregando.value = true
  erro.value = ''
  try {
    const r = await buscarRequisicoes(estado.competenciaId, { busca: busca.value, soComReserva: soComReserva.value, pagina: pagina.value, porPagina: POR_PAGINA })
    linhas.value = r.linhas
    total.value = r.total
  } catch (e) { erro.value = e.message } finally { carregando.value = false }
}

let espera
watch([busca, soComReserva], () => { clearTimeout(espera); espera = setTimeout(() => { pagina.value = 0; carregarLista() }, 300) })
watch(pagina, carregarLista)

onMounted(async () => {
  try { resumo.value = await resumoRequisicoes(estado.competenciaId) } catch (e) { erro.value = e.message }
  carregarLista()
})
</script>

<template>
  <section class="painel">
    <h2>Resumo das requisições em andamento</h2>
    <p class="suave nota">Aba 2 da planilha: soma do valor de reserva por programa. Capital = natureza 4, custeio = natureza 3.</p>
    <div class="tabela-rolagem">
      <table>
        <thead><tr><th>Programa</th><th>Capital</th><th>Custeio</th><th>Total</th></tr></thead>
        <tbody>
          <tr v-for="r in resumoOrdenado" :key="r.programa">
            <td>{{ r.programa }} · {{ NOMES[r.programa] }}</td>
            <td><Valor :v="r.capital" /></td><td><Valor :v="r.custeio" /></td><td><Valor :v="r.total" /></td>
          </tr>
        </tbody>
        <tfoot><tr><td>Total</td><td><Valor :v="somaResumo('capital')" /></td><td><Valor :v="somaResumo('custeio')" /></td><td><Valor :v="somaResumo('total')" /></td></tr></tfoot>
      </table>
    </div>
  </section>

  <section class="painel">
    <h2>Requisições</h2>
    <p class="suave nota">Aba 1 da planilha, vinda do Sistema de Compras (Demonstrativo de Despesas).</p>
    <div class="filtros">
      <input v-model="busca" type="search" placeholder="Buscar por requisição, ficha, item, divisão, fornecedor ou natureza" />
      <label v-if="!modoDemo" class="marcar"><input v-model="soComReserva" type="checkbox" /> só com reserva</label>
    </div>
    <Carregando :carregando="carregando" :erro="erro">
      <div class="tabela-rolagem">
        <table class="compacta">
          <thead><tr><th>Requisição</th><th>Ficha</th><th>Programa</th><th class="texto">Item</th><th class="texto">Divisão</th><th class="texto">Natureza</th><th>Empenhado</th><th>Pago</th><th>Reserva</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in linhas" :key="i">
              <td>{{ r.nr_requisicao }}/{{ r.dt_ano_requisicao }}</td><td>{{ r.cd_reduzido }}</td><td>{{ r.cd_programa }}</td>
              <td class="texto">{{ r.desc_item }}</td><td class="texto">{{ r.nm_divisao }}</td>
              <td class="texto">{{ r.natureza }} {{ r.desc_natureza }}</td>
              <td><Valor :v="r.vl_empenhado" /></td><td><Valor :v="r.vl_pago" /></td><td><Valor :v="r.vl_reserva" /></td>
            </tr>
            <tr v-if="!linhas.length"><td colspan="9" class="suave">Nenhuma requisição encontrada.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="paginacao">
        <button class="botao secundario" :disabled="pagina === 0" @click="pagina--">‹ anterior</button>
        <span class="suave">página {{ pagina + 1 }} de {{ paginas }} · {{ total }} linhas</span>
        <button class="botao secundario" :disabled="pagina + 1 >= paginas" @click="pagina++">próxima ›</button>
      </div>
    </Carregando>
  </section>
</template>
