<script setup lang="ts">
import { onMounted } from 'vue'
import { useOrganizationStore } from '@/stores/organization'

// Load company branding once on startup so logo/name are ready before render
const org = useOrganizationStore()
onMounted(() => org.load())
</script>

<template>
  <RouterView />
</template>
