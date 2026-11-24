import { reactive } from 'vue'
import { supabase, modoDemo } from './supabase'

export const auth = reactive({ usuario: null })

export async function iniciarAuth() {
  if (modoDemo) { auth.usuario = { email: 'modo demonstração' }; return }
  const { data } = await supabase.auth.getSession()
  auth.usuario = data.session?.user ?? null
  supabase.auth.onAuthStateChange((_evento, sessao) => { auth.usuario = sessao?.user ?? null })
}

// E-mail e senha funcionam dentro do portal. Link mágico abre outra aba e o login não chega ao iframe.
export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
}

export const sair = () => (modoDemo ? Promise.resolve() : supabase.auth.signOut())

// Envia o e-mail com o link para criar uma nova senha (abre /nova-senha).
export async function pedirNovaSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nova-senha` })
  if (error) throw new Error('Não foi possível enviar o e-mail agora. Tente de novo em instantes.')
}

export async function trocarSenha(senha) {
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) throw new Error(error.message)
}
