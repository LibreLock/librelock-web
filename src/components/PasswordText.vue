<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: string }>()

type Kind = 'letter' | 'digit' | 'symbol'

// Tinting digits and symbols makes look-alikes (0/O, l/1/I) and the structure of a generated
// password readable at a glance when reading it off the screen
const runs = computed(() => {
  const out: { kind: Kind; text: string }[] = []
  for (const ch of props.value) {
    const kind: Kind = /\p{L}/u.test(ch) ? 'letter' : /\p{N}/u.test(ch) ? 'digit' : 'symbol'
    const last = out[out.length - 1]
    if (last && last.kind === kind) last.text += ch
    else out.push({ kind, text: ch })
  }
  return out
})

const TINT: Record<Kind, string> = {
  letter: '',
  digit: 'text-sky-600 dark:text-sky-400',
  symbol: 'text-orange-600 dark:text-orange-400',
}
</script>

<template>
  <span class="font-mono"
    ><span v-for="(run, i) in runs" :key="i" :class="TINT[run.kind]">{{ run.text }}</span></span
  >
</template>
