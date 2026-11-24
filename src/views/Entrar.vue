<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { entrar } from '../lib/auth'

const router = useRouter()
const email = ref('')
const senha = ref('')
const erro = ref('')
const enviando = ref(false)

async function enviar() {
  erro.value = ''
  enviando.value = true
  try {
    await entrar(email.value, senha.value)
    router.push('/')
  } catch (e) {
    erro.value = e.message
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="tela-entrar">
    <div class="entrar-marca">
      <img src="/logo-branca.png" alt="DMAE, Departamento Municipal de Água e Esgoto, e Prefeitura de Uberlândia" />
      <div>
        <h1>Orçamento do DMAE</h1>
        <p>Acompanhamento orçamentário e financeiro: requisições, despesa, receitas e relatórios do mês.</p>
      </div>
      <small>Acesso restrito a servidores do DMAE.</small>
      <svg viewBox="0 0 400 200" aria-hidden="true">
        <g fill="none" stroke="#fff" stroke-width="2">
          <path d="M0 60 Q50 30 100 60 T200 60 T300 60 T400 60" />
          <path d="M0 100 Q50 70 100 100 T200 100 T300 100 T400 100" />
          <path d="M0 140 Q50 110 100 140 T200 140 T300 140 T400 140" />
          <path d="M0 180 Q50 150 100 180 T200 180 T300 180 T400 180" />
        </g>
      </svg>
      <div class="faixa-marca" aria-hidden="true" />
    </div>
    <div class="entrar-form">
      <form @submit.prevent="enviar">
        <div>
          <h2>Entrar</h2>
          <p class="suave">Use seu e-mail institucional.</p>
        </div>
        <label><span class="campo-rotulo">E-mail</span><input v-model="email" class="campo" type="email" required autocomplete="username" /></label>
        <label><span class="campo-rotulo">Senha</span><input v-model="senha" class="campo" type="password" required autocomplete="current-password" /></label>
        <p v-if="erro" class="erro">{{ erro }}</p>
        <button class="botao" :disabled="enviando">{{ enviando ? 'Entrando…' : 'Entrar' }}</button>
      </form>
    </div>
  </div>
</template>
