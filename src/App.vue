<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, sair } from './lib/auth'
import { modoDemo } from './lib/supabase'
import { estado, carregarCompetencias, escolherCompetencia } from './lib/estado'
import { rotuloCompetencia } from './lib/formato'

const rota = useRoute()
const router = useRouter()

const MENU = [
  { itens: [{ rotulo: 'Painel', para: '/' }, { rotulo: 'Requisições', para: '/requisicoes' }, { rotulo: 'Despesa por ficha', para: '/despesa' }, { rotulo: 'Anexo 02', para: '/anexo2' }] },
  { titulo: 'Próximas etapas', itens: [{ rotulo: 'Receitas', etapa: 2 }, { rotulo: 'Suplementação', etapa: 2 }, { rotulo: 'Relatórios', etapa: 3 }, { rotulo: 'Diretores', etapa: 4 }] },
]

const iniciais = computed(() => {
  const partes = (auth.usuario?.email ?? '').split('@')[0].split(/[._-]+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase() || '·'
})

watch(() => auth.usuario, (u) => { if (u) carregarCompetencias() }, { immediate: true })

async function sairDoSistema() {
  await sair()
  router.push('/entrar')
}
</script>

<template>
  <RouterView v-if="rota.meta.publica" />
  <div v-else class="estrutura">
    <header class="topo">
      <RouterLink to="/" class="marca">
        <img src="/logo-branca.png" alt="DMAE e Prefeitura de Uberlândia" />
        <span>Orçamento</span>
      </RouterLink>
      <span class="espaco" />
      <label class="seletor-mes">
        <span>Mês de referência</span>
        <select :value="estado.competenciaId" :disabled="!estado.competencias.length" @change="escolherCompetencia(Number($event.target.value))">
          <option v-if="!estado.competencias.length" :value="null">nenhum mês</option>
          <option v-for="c in estado.competencias" :key="c.id" :value="c.id">
            {{ rotuloCompetencia(c) }}{{ c.situacao === 'fechada' ? ' (fechado)' : '' }}
          </option>
        </select>
      </label>
      <div class="usuario">
        <span class="avatar">{{ iniciais }}</span>
        <span class="nome">{{ auth.usuario?.email }}</span>
        <button v-if="!modoDemo" class="botao-sair" @click="sairDoSistema">Sair</button>
      </div>
    </header>
    <nav class="abas-celular">
      <RouterLink v-for="i in MENU[0].itens" :key="i.para" :to="i.para">{{ i.rotulo }}</RouterLink>
    </nav>
    <div class="corpo">
      <aside class="lateral">
        <nav>
          <template v-for="(g, n) in MENU" :key="n">
            <span v-if="g.titulo" class="grupo">{{ g.titulo }}</span>
            <template v-for="i in g.itens" :key="i.rotulo">
              <RouterLink v-if="i.para" :to="i.para">{{ i.rotulo }}</RouterLink>
              <span v-else class="futuro" :title="`Chega na etapa ${i.etapa}`">{{ i.rotulo }} <em>etapa {{ i.etapa }}</em></span>
            </template>
          </template>
        </nav>
      </aside>
      <main class="conteudo">
        <div v-if="modoDemo" class="aviso amarelo">
          <span class="icone">!</span>
          <b>Modo demonstração</b>
          <span>Dados de agosto/2025 tirados da planilha. Configure o Supabase no <code>.env</code> para usar dados reais.</span>
        </div>
        <p v-if="estado.erro" class="erro">{{ estado.erro }}</p>
        <RouterView v-if="estado.competenciaId || rota.path === '/'" :key="estado.competenciaId" />
        <section v-else-if="!estado.carregando" class="cartao cartao-corpo">
          <b class="cartao-titulo">Nenhum mês importado</b>
          <p class="suave">Abra um mês no Painel e peça a atualização, ou rode o importador.</p>
        </section>
      </main>
    </div>
  </div>
</template>
