<script setup>
import { ref, computed, onMounted } from 'vue'
import Valor from '../components/Valor.vue'
import Carregando from '../components/Carregando.vue'
import { estado } from '../lib/estado'
import { despesaPorFicha } from '../lib/dados'

const COLUNAS = [
  ['orcado', 'Orçado'], ['suplementacao', 'Suplementação'], ['orcado_atualizado', 'Orçado atualizado'],
  ['requisicoes', 'Requisições em andamento'], ['empenhado', 'Empenhado'], ['saldo', 'Saldo da ficha'], ['pago', 'Pago'],
]
const fichas = ref([])
const carregando = ref(true)
const erro = ref('')
const grupoFiltro = ref('')
const busca = ref('')
const esconderZeradas = ref(true)

const zerada = (f) => COLUNAS.every(([c]) => Number(f[c] || 0) === 0)
const somar = (lista) => Object.fromEntries(COLUNAS.map(([c]) => [c, lista.reduce((t, f) => t + Number(f[c] || 0), 0)]))
const grupos = computed(() => [...new Set(fichas.value.map((f) => f.grupo))])

// Programa → ação → fichas, como na aba 5, com os totais de cada nível.
const arvore = computed(() => {
  const b = busca.value.trim().toLowerCase()
  const visiveis = fichas.value.filter((f) => (!grupoFiltro.value || f.grupo === grupoFiltro.value)
    && (!esconderZeradas.value || !zerada(f))
    && (!b || String(f.ficha).includes(b) || (f.natureza_desc ?? '').toLowerCase().includes(b) || (f.acao_nome ?? '').toLowerCase().includes(b)))
  const porGrupo = new Map()
  for (const f of visiveis) {
    if (!porGrupo.has(f.grupo)) porGrupo.set(f.grupo, new Map())
    const acoes = porGrupo.get(f.grupo)
    const chave = `${f.acao} ${f.acao_nome}`
    if (!acoes.has(chave)) acoes.set(chave, [])
    acoes.get(chave).push(f)
  }
  return [...porGrupo].map(([grupo, acoes]) => ({
    grupo,
    acoes: [...acoes].map(([acao, lista]) => ({ acao, fichas: lista, total: somar(lista) })),
    total: somar([...acoes.values()].flat()),
  }))
})
const totalGeral = computed(() => somar(arvore.value.flatMap((g) => g.acoes.flatMap((a) => a.fichas))))

onMounted(async () => {
  try { fichas.value = await despesaPorFicha(estado.competenciaId) } catch (e) { erro.value = e.message } finally { carregando.value = false }
})
</script>

<template>
  <section class="painel">
    <h2>Despesa detalhada por natureza</h2>
    <p class="suave nota">
      Aba 5 da planilha. Requisições vêm do Compras; empenhado e pago, do Anexo 02 (acumulado no ano).
      Saldo = orçado atualizado − requisições − empenhado. Suplementação entra na etapa 2.
    </p>
    <div class="filtros">
      <select v-model="grupoFiltro"><option value="">Todos os programas</option><option v-for="g in grupos" :key="g">{{ g }}</option></select>
      <input v-model="busca" type="search" placeholder="Ficha, natureza ou ação" />
      <label class="marcar"><input v-model="esconderZeradas" type="checkbox" /> esconder fichas zeradas</label>
    </div>
    <Carregando :carregando="carregando" :erro="erro">
      <div class="tabela-rolagem">
        <table class="compacta">
          <thead><tr><th>Ficha</th><th class="texto">Natureza</th><th>Tipo</th><th>Fonte</th><th v-for="[c, r] in COLUNAS" :key="c">{{ r }}</th></tr></thead>
          <tbody v-for="g in arvore" :key="g.grupo">
            <tr class="nivel-grupo"><td :colspan="4 + COLUNAS.length">{{ g.grupo }}</td></tr>
            <template v-for="a in g.acoes" :key="a.acao">
              <tr class="nivel-acao"><td :colspan="4 + COLUNAS.length">{{ a.acao }}</td></tr>
              <tr v-for="f in a.fichas" :key="f.ficha">
                <td>{{ f.ficha }}</td><td class="texto">{{ f.natureza_desc }}</td><td>{{ f.tipo_ficha }}</td><td>{{ f.fonte }}</td>
                <td v-for="[c] in COLUNAS" :key="c"><Valor :v="f[c]" /></td>
              </tr>
              <tr class="total-acao"><td colspan="4">Total da ação</td><td v-for="[c] in COLUNAS" :key="c"><Valor :v="a.total[c]" /></td></tr>
            </template>
            <tr class="total-grupo"><td colspan="4">Total · {{ g.grupo }}</td><td v-for="[c] in COLUNAS" :key="c"><Valor :v="g.total[c]" /></td></tr>
          </tbody>
          <tfoot><tr><td colspan="4">Total geral</td><td v-for="[c] in COLUNAS" :key="c"><Valor :v="totalGeral[c]" /></td></tr></tfoot>
        </table>
      </div>
    </Carregando>
  </section>
</template>
