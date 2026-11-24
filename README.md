# Orçamento · DMAE

Sistema do setor de Orçamento, no lugar da planilha *Passo a passo - Orçamento*. É um sistema próprio
(repositório, Supabase e Vercel próprios); o Portal do Núcleo só o lista e monitora (`nucleo.json`).

## Etapas

1. **Base e importação** (este momento): mês de referência com histórico, requisições (abas 1 e 2),
   Anexo 02 (aba 5.1) e despesa por ficha (aba 5), sincronizador do banco interno.
2. Receitas, suplementação e lançamentos manuais (abas 3, 4, 9 e campos digitados da aba 7).
3. Relatórios 6, 7 e 8, fechamento do mês e exportação.
4. Diretores: saldo e remanejamentos, cada um vendo só o seu.

## Como funciona

```
PostgreSQL interno (Compras + Contabilidade)
        │  só leitura, dentro da rede do DMAE
        ▼
sincronizador/  ── HTTPS ──▶  Supabase do Orçamento  ◀──  sistema (Vercel)  ◀──  Portal do Núcleo
```

- Cada importação grava uma **foto do mês de referência**. Importar de novo o mesmo mês substitui a foto
  de uma vez só (ninguém vê dados pela metade). Mês fechado não muda mais.
- O botão **Atualizar agora** grava um pedido; o sincronizador, dentro da rede, atende em até 2 minutos.
  Nada de fora acessa o banco interno.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem as variáveis do Supabase o sistema abre em **modo demonstração**, com os dados de agosto/2025 da planilha.

## Colocar no ar

1. Crie um projeto Supabase para o Orçamento e rode, em ordem, os arquivos de `supabase/migrations/`
   no SQL Editor.
2. Crie os usuários em Authentication → Users (e-mail e senha) e dê o papel de cada um:
   ```sql
   insert into perfis (usuario_id, nome, papel)
   select id, 'Nome da pessoa', 'orcamento' from auth.users where email = 'pessoa@exemplo.gov.br';
   ```
   Papéis: `admin`, `orcamento` (equipe do setor) e `diretor` (acesso próprio na etapa 4).
3. Na Vercel, importe este repositório (framework Vite) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (chave **publishable**).
4. Preencha `url` e `monitorar` no `nucleo.json` para o Portal monitorar o sistema.
5. Instale o sincronizador numa máquina da rede do DMAE: veja [sincronizador/README.md](sincronizador/README.md).

## Conferência com a planilha

Com a planilha de agosto/2025 importada, o sistema bate centavo a centavo com a planilha em:
requisições em andamento por ficha e por programa (abas 2 e 5), empenhado e pago por ficha (aba 5).
O saldo da ficha ainda difere exatamente pela suplementação (R$ 29.973.797,31), que entra na etapa 2.
