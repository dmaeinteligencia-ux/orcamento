<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FundoEntrar from '../components/FundoEntrar.vue'
import { auth, trocarSenha } from '../lib/auth'

const router = useRouter()
const senha = ref('')
const repetir = ref('')
const erro = ref('')
const enviando = ref(false)

async function salvar() {
  erro.value = ''
  if (senha.value.length < 8) { erro.value = 'Use pelo menos 8 caracteres.'; return }
  if (senha.value !== repetir.value) { erro.value = 'As duas senhas não são iguais.'; return }
  enviando.value = true
  try {
    await trocarSenha(senha.value)
    router.push('/')
  } catch (e) { erro.value = e.message } finally { enviando.value = false }
}
</script>

<template>
  <FundoEntrar>
    <span class="etiqueta">Orçamento DMAE</span>
    <form v-if="auth.usuario" class="form-entrar" @submit.prevent="salvar">
      <div>
        <h2>Nova senha</h2>
        <p class="suave">Escolha a senha que você vai usar daqui em diante.</p>
      </div>
      <label><span class="campo-rotulo">Nova senha</span><input v-model="senha" class="campo" type="password" required autocomplete="new-password" /></label>
      <label><span class="campo-rotulo">Repita a senha</span><input v-model="repetir" class="campo" type="password" required autocomplete="new-password" /></label>
      <p v-if="erro" class="erro">{{ erro }}</p>
      <button class="botao" :disabled="enviando">{{ enviando ? 'Salvando…' : 'Salvar e entrar' }}</button>
    </form>
    <div v-else class="form-entrar">
      <h2>Link inválido ou vencido</h2>
      <p class="suave">Peça um novo link em "Esqueci minha senha" na tela de entrar.</p>
      <RouterLink to="/entrar" class="botao">Voltar para entrar</RouterLink>
    </div>
  </FundoEntrar>
</template>
