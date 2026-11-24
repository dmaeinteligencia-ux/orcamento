<script setup>
defineProps({ carregando: Boolean, erro: String })
</script>

<template>
  <p v-if="erro" class="erro">⚠ {{ erro }}</p>
  <p v-else-if="carregando" class="suave">Carregando…</p>
  <slot v-else />
</template>
