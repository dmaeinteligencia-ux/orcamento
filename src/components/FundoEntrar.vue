<script setup>
// Fundo da tela de entrar: degradê com grade e cartões flutuantes com o que o sistema faz.
// Sem números: antes do login não há dados para mostrar.
const CARTOES = [
  { titulo: 'Requisições em andamento', texto: 'Direto do Sistema de Compras', classe: 'k1' },
  { titulo: 'Empenhado e pago', texto: 'Direto da Contabilidade', classe: 'k2' },
  { titulo: 'Histórico mês a mês', texto: 'Cada fechamento guardado', classe: 'k3' },
  { titulo: 'Despesa por ficha', texto: 'Saldo de cada ficha', classe: 'k4' },
]
</script>

<template>
  <div class="fundo-entrar">
    <img class="logo" src="/logo-branca.png" alt="DMAE e Prefeitura de Uberlândia" />
    <div v-for="c in CARTOES" :key="c.classe" class="flutuante" :class="c.classe" aria-hidden="true">
      <span>{{ c.texto }}</span><b>{{ c.titulo }}</b>
    </div>
    <div class="vidro"><slot /></div>
    <small class="rodape">Acesso restrito a servidores do DMAE</small>
  </div>
</template>
