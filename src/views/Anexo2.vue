<script setup>
import { ref, computed, onMounted } from 'vue'
import Valor from '../components/Valor.vue'
import Carregando from '../components/Carregando.vue'
import Cabecalho from '../components/Cabecalho.vue'
import { estado } from '../lib/estado'
import { despesaAnexo2 } from '../lib/dados'

const COLUNAS = [
  ['vl_empenhado', 'Empenhado no mês'], ['vl_empenhado_acul', 'Empenhado acumulado'], ['vl_liquidado_acul', 'Liquidado acumulado'],
  ['vl_pago', 'Pago no mês'], ['vl_pago_acul', 'Pago acumulado'], ['vl_suplementar', 'Suplementado'], ['vl_cancelado', 'Cancelado'],
]
const linhas = ref([])
const carregando = ref(true)
const erro = ref('')
const busca = ref('')

const visiveis = computed(() => {
  const b = busca.value.trim().toLowerCase()
  return b ? linhas.value.filter((l) => [l.ficha, l.programa, l.natureza_despesa, l.natureza_nome, l.acao_nome].some((v) => String(v ?? '').toLowerCase().includes(b))) : linhas.value
})
const total = computed(() => Object.fromEntries(COLUNAS.map(([c]) => [c, visiveis.value.reduce((t, l) => t + Number(l[c] || 0), 0)])))

onMounted(async () => {
  try { linhas.value = await despesaAnexo2(estado.competenciaId) } catch (e) { erro.value = e.message } finally { carregando.value = false }
})
</script>

<template>
  <Cabecalho titulo="Anexo 02 · Despesa por natureza" subtitulo="Aba 5.1 da planilha, vinda do Sistema de Contabilidade (Anexos da Lei 4.320/64)." />
  <section class="cartao">
    <div class="filtros"><input v-model="busca" class="campo" type="search" placeholder="Ficha, programa, natureza ou ação" /></div>
    <Carregando :carregando="carregando" :erro="erro">
      <div class="tabela-rolagem">
        <table class="lista compacta">
          <thead><tr><th>Ficha</th><th>Programa</th><th class="texto">Ação</th><th class="texto">Natureza</th><th v-for="[c, r] in COLUNAS" :key="c">{{ r }}</th></tr></thead>
          <tbody>
            <tr v-for="l in visiveis" :key="l.ficha">
              <td class="codigo">{{ l.ficha }}</td><td>{{ l.programa }}</td><td class="texto">{{ l.proj_atividade }} {{ l.acao_nome }}</td>
              <td class="texto">{{ l.natureza_despesa }} {{ l.natureza_nome }}</td>
              <td v-for="[c] in COLUNAS" :key="c"><Valor :v="l[c]" /></td>
            </tr>
          </tbody>
          <tfoot><tr><td colspan="4">Total ({{ visiveis.length }} fichas)</td><td v-for="[c] in COLUNAS" :key="c"><Valor :v="total[c]" /></td></tr></tfoot>
        </table>
      </div>
    </Carregando>
  </section>
</template>
