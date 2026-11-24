<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, sair } from './lib/auth'
import { modoDemo } from './lib/supabase'
import { estado, carregarCompetencias, escolherCompetencia } from './lib/estado'
import { rotuloCompetencia } from './lib/formato'

const rota = useRoute()
const router = useRouter()

watch(() => auth.usuario, (u) => { if (u) carregarCompetencias() }, { immediate: true })

async function sairDoSistema() {
  await sair()
  router.push('/entrar')
}
</script>

<template>
  <template v-if="rota.meta.publica">
    <RouterView />
  </template>
  <template v-else>
    <header class="topo">
      <img src="/logo-dmae.png" alt="DMAE" />
      <h1>Orçamento</h1>
      <label class="seletor-mes">
        <span>MÊS DE REFERÊNCIA</span>
        <select :value="estado.competenciaId" @change="escolherCompetencia(Number($event.target.value))" :disabled="!estado.competencias.length">
          <option v-if="!estado.competencias.length" :value="null">nenhum mês importado</option>
          <option v-for="c in estado.competencias" :key="c.id" :value="c.id">
            {{ rotuloCompetencia(c) }}{{ c.situacao === 'fechada' ? ' (fechado)' : '' }}
          </option>
        </select>
      </label>
      <span class="suave usuario">{{ auth.usuario?.email }}</span>
      <button v-if="!modoDemo" class="botao secundario" @click="sairDoSistema">Sair</button>
    </header>
    <nav class="abas">
      <RouterLink to="/">Painel</RouterLink>
      <RouterLink to="/requisicoes">Requisições</RouterLink>
      <RouterLink to="/despesa">Despesa por ficha</RouterLink>
      <RouterLink to="/anexo2">Anexo 02</RouterLink>
    </nav>
    <p v-if="modoDemo" class="aviso-demo">
      Modo demonstração: dados de agosto/2025 tirados da planilha. Ligue o Supabase no <code>.env</code> para usar dados reais.
    </p>
    <main class="conteudo">
      <p v-if="estado.erro" class="erro">⚠ {{ estado.erro }}</p>
      <RouterView v-if="estado.competenciaId || rota.path === '/'" :key="estado.competenciaId" />
      <section v-else-if="!estado.carregando" class="painel">
        <h2>Nenhum mês importado</h2>
        <p class="suave">Abra um mês no Painel e peça a atualização, ou rode o importador.</p>
      </section>
    </main>
  </template>
</template>
