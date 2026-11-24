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
