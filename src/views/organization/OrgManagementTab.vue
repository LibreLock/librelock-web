<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import OrgRegistrationCard from './OrgRegistrationCard.vue'
import OrgDangerZone from './OrgDangerZone.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <OrgRegistrationCard />

    <!-- Owner-only: revert the whole instance to personal mode -->
    <OrgDangerZone v-if="auth.isOwner" />
  </div>
</template>
