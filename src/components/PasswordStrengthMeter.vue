<script setup lang="ts">
import { computed } from 'vue'
import { strengthLabel, strengthColor, strengthDot } from '@/services/passwordStrength'

const { score } = defineProps<{ score: number }>()

const percent = computed(() => Math.round((Math.max(0, Math.min(10, score)) / 10) * 100))
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="strengthDot(score)"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <span class="shrink-0 text-xs font-medium tabular-nums" :class="strengthColor(score)">
      {{ strengthLabel(score) }} · {{ score }}/10
    </span>
  </div>
</template>
