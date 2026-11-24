<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FundoEntrar from '../components/FundoEntrar.vue'
import { entrar, pedirNovaSenha } from '../lib/auth'

const router = useRouter()
const email = ref('')
const senha = ref('')
const erro = ref('')
const aviso = ref('')
const enviando = ref(false)

async function enviar() {
  erro.value = ''
  aviso.value = ''
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

async function esqueci() {
  erro.value = ''
  aviso.value = ''
  if (!email.value) { erro.value = 'Informe seu e-mail para receber o link de nova senha.'; return }
  try {
    await pedirNovaSenha(email.value)
    aviso.value = 'Se o e-mail estiver cadastrado, você vai receber o link em instantes.'
  } catch (e) { erro.value = e.message }
}
</script>

<template>
  <FundoEntrar>
    <span class="etiqueta">Orçamento DMAE</span>
    <form class="form-entrar" @submit.prevent="enviar">
      <div>
        <h2>Bem-vindo de volta</h2>
        <p class="suave">Entre com seu e-mail institucional.</p>
      </div>
      <label><span class="campo-rotulo">E-mail</span><input v-model="email" class="campo" type="email" required autocomplete="username" /></label>
      <label><span class="campo-rotulo">Senha</span><input v-model="senha" class="campo" type="password" required autocomplete="current-password" /></label>
      <p v-if="erro" class="erro">{{ erro }}</p>
      <p v-if="aviso" class="ok">{{ aviso }}</p>
      <button class="botao" :disabled="enviando">{{ enviando ? 'Entrando…' : 'Entrar' }}</button>
      <button type="button" class="link" @click="esqueci">Esqueci minha senha</button>
    </form>
  </FundoEntrar>
</template>
