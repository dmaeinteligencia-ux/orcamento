import { createClient } from '@supabase/supabase-js'

// Sem as variáveis do Supabase o sistema abre em modo demonstração, com os dados de agosto/2025
// tirados da planilha "Passo a passo - Orçamento".
export const modoDemo = !import.meta.env.VITE_SUPABASE_URL

// A sessão fica no localStorage (padrão do supabase-js). Dentro do portal o navegador guarda esse
// armazenamento separado do site aberto em aba própria, então o login é feito uma vez em cada lugar.
export const supabase = modoDemo ? null : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
