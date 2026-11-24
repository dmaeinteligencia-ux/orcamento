<script setup>
defineProps({ carregando: Boolean, erro: String })
</script>

<template>
  <p v-if="erro" class="erro cartao-corpo">{{ erro }}</p>
  <p v-else-if="carregando" class="suave cartao-corpo">Carregando…</p>
  <slot v-else />
</template>
