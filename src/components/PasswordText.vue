<script setup lang="ts">
defineProps<{ value: string }>()
</script>

<template>
  <span class="font-mono">{{ value }}</span>
</template>
