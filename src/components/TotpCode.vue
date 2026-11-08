<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { PhCheck, PhCopy } from '@phosphor-icons/vue'
import { useTotp } from '@/composables/useTotp'
import { formatCode } from '@/services/totp'

// `spread` stretches the button over its row and pushes the copy icon to the far edge
const props = withDefaults(defineProps<{ uri: string; size?: 'md' | 'lg'; spread?: boolean }>(), {
  size: 'md',
  spread: false,
})
const emit = defineEmits<{ (e: 'copied'): void }>()

const { code, nextCode, remaining, period } = useTotp(() => props.uri)

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | null = null

// Last five seconds: the code is about to change, so signal it before someone types a stale one
const expiring = computed(() => remaining.value <= 5)

const RADIUS = 9
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// The ring drains to where it should be one second from now, so a 1s linear transition makes it
// move continuously and reach empty exactly as the code rolls over
const dashOffset = computed(
  () => CIRCUMFERENCE * (1 - Math.max(0, remaining.value - 1) / period.value),
)

// On rollover the ring refills: jump there instead of sweeping back round over a second
const snap = ref(false)
let frame = 0
watch(remaining, (now, before) => {
  if (now <= before) return
  snap.value = true
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      snap.value = false
    })
  })
})

async function copy() {
  if (!code.value) return
  try {
    await navigator.clipboard.writeText(code.value)
  } catch {
    return
  }
  copied.value = true
  emit('copied')
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

defineExpose({ copy })

onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <button
    type="button"
    class="group flex items-center gap-3 rounded-lg text-left cursor-pointer disabled:cursor-default"
    :class="spread ? 'w-full' : ''"
    :disabled="!code"
    title="Copy code"
    :aria-label="code ? `Copy one-time code, ${remaining} seconds left` : 'One-time code'"
    @click="copy"
  >
    <span class="flex flex-col items-start">
      <span
        class="font-mono font-medium tabular-nums tracking-wide transition-colors"
        :class="[
          size === 'lg' ? 'text-2xl' : 'text-[15px]',
          expiring ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100',
        ]"
        >{{ code ? formatCode(code) : '--- ---' }}</span
      >
      <!-- Settings -> Account -> Authenticator: the code that takes over when this one runs out -->
      <span
        v-if="nextCode"
        class="mt-0.5 font-mono text-xs tabular-nums tracking-wide transition-colors"
        :class="expiring ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'"
        title="Next code"
        ><span class="sr-only">Next code: </span>{{ formatCode(nextCode) }}</span
      >
    </span>
    <svg
      class="shrink-0 -rotate-90"
      :class="size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        :r="RADIUS"
        fill="none"
        stroke-width="2.5"
        class="stroke-gray-200 dark:stroke-white/10"
      />
      <circle
        cx="12"
        cy="12"
        :r="RADIUS"
        fill="none"
        stroke-width="2.5"
        stroke-linecap="round"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
        class="ease-linear"
        :class="[
          expiring ? 'stroke-amber-500' : 'stroke-gray-500 dark:stroke-gray-400',
          snap ? 'transition-none' : 'transition-[stroke-dashoffset,stroke] duration-1000',
        ]"
      />
    </svg>
    <span
      class="text-gray-400 transition-colors group-hover:text-gray-600 dark:group-hover:text-gray-200"
      :class="spread ? 'ml-auto' : ''"
    >
      <PhCheck v-if="copied" :size="16" weight="bold" class="text-emerald-500" />
      <PhCopy v-else :size="16" />
    </span>
  </button>
</template>
