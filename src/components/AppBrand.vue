<script setup lang="ts">
import { useOrganizationStore } from '@/stores/organization'
import IconPadlock from './icons/IconPadlock.vue'

type BrandSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    size?: BrandSize
    showName?: boolean
    nameClass?: string
  }>(),
  { size: 'md', showName: true, nameClass: '' },
)

const org = useOrganizationStore()

const logoBoxClasses: Record<BrandSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-15 w-15',
}
</script>

<template>
  <div class="flex items-center gap-3">
    <img
      v-if="org.hasLogo"
      :src="org.logoUrl"
      :alt="org.name"
      :class="logoBoxClasses[props.size]"
      class="shrink-0 rounded-lg object-contain"
    />
    <IconPadlock v-else :size="props.size" />
    <span v-if="props.showName" :class="props.nameClass">{{ org.name }}</span>
  </div>
</template>
