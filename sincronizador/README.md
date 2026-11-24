# Sincronizador

Programa que roda **numa máquina dentro da rede do DMAE**. Lê o PostgreSQL dos sistemas de Compras e
Contabilidade (só leitura) e envia os dados para o Supabase do Orçamento por HTTPS. O banco interno
não fica exposto: os dados só saem de dentro para fora.

## O que falta da TI

1. As consultas SQL dos dois relatórios, para colar em:
   - `consultas/requisicoes.sql`: "Demonstrativo de Despesas" (Compras → Relatórios → Requisições → DMAE);
   - `consultas/despesa_anexo2.sql`: "Anexo 02 Despesa Detalhada por Natureza" (Contabilidade).
   Cada arquivo diz quais colunas a consulta precisa devolver. Enquanto um arquivo começar com
   `-- PENDENTE`, o sincronizador pula aquela fonte.
2. Um usuário **somente leitura** no PostgreSQL.
3. Uma máquina ligada (Windows ou Linux) com Node.js 22 e saída HTTPS para `*.supabase.co`.

## Instalar

```bash
cd sincronizador
npm install
cp .env.example .env   # e preencha
```

A chave do Supabase aqui é a **secreta** (service_role). Ela fica só no `.env` desta máquina.

## Usar

| Comando | O que faz |
| --- | --- |
| `node sincronizar.mjs` | importa o mês atual uma vez |
| `node sincronizar.mjs --ano 2025 --mes 8` | importa um mês específico |
| `node sincronizar.mjs --vigiar` | fica rodando: todo dia na `HORA_DIARIA` e a cada "Atualizar agora" |
| `node importar-planilha.mjs "planilha.xlsx" --ano 2025 --mes 8` | carrega as abas 1 e 5.1 de uma planilha antiga (histórico) |

Para deixar o `--vigiar` sempre ligado:
- **Windows**: Agendador de Tarefas → "Ao iniciar o computador", programa `node`, argumentos
  `sincronizar.mjs --vigiar`, iniciar em: a pasta do sincronizador.
- **Linux**: um serviço systemd com `ExecStart=/usr/bin/node sincronizar.mjs --vigiar` e `Restart=always`.

Cada importação fica registrada na tabela `importacoes` e aparece no Painel do sistema.
