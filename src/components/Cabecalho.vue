<script setup>
defineProps({ titulo: String, subtitulo: String })
</script>

<template>
  <div class="cabecalho">
    <div>
      <h1>{{ titulo }}</h1>
      <p v-if="subtitulo">{{ subtitulo }}</p>
    </div>
    <div class="acoes"><slot name="acoes" /></div>
  </div>
</template>
