<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import OrgAccessCard from './OrgAccessCard.vue'
import OrgDangerZone from './OrgDangerZone.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <!-- Admins + owners: registration policy + auto-grant shared vault -->
    <OrgAccessCard />

    <!-- Owner-only: revert the whole instance to personal mode -->
    <OrgDangerZone v-if="auth.isOwner" />
  </div>
</template>
