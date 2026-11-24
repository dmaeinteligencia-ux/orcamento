<script setup>
import { reais, negativo } from '../lib/formato'
defineProps({ v: { type: [Number, String], default: 0 } })
</script>

<template>
  <span class="num" :class="{ neg: negativo(v), zero: Number(v) === 0 }">{{ reais(v) }}</span>
</template>
