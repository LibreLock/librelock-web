<script setup lang="ts" generic="T extends string">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    tabs: readonly T[]
    labels: Record<T, string>
    active: T
    disabled?: Partial<Record<T, boolean>>
    titles?: Partial<Record<T, string | undefined>>
    size?: 'sm' | 'md'
    // Fill the container and split it evenly, instead of hugging the labels
    stretch?: boolean
  }>(),
  { disabled: () => ({}), titles: () => ({}), size: 'md', stretch: false },
)

const emit = defineEmits<{ select: [tab: T] }>()

// The thumb glides to the chosen tab rather than each tab lighting up on its own. Measured in the
// track's own coordinates, so it rides along when the track scrolls sideways on narrow screens
const track = ref<HTMLElement | null>(null)
const thumb = ref<{ x: number; w: number } | null>(null)
const ready = ref(false)

function measure() {
  const el = track.value?.querySelector<HTMLElement>('[aria-selected="true"]')
  thumb.value = el ? { x: el.offsetLeft, w: el.offsetWidth } : null
}

watch(
  () => [props.active, props.tabs.length],
  () => nextTick(measure),
)

// A track that mounts hidden (another tab, a breakpoint) measures zero; the observer catches the
// moment it gets a real size
let observer: ResizeObserver | undefined

onMounted(() => {
  measure()
  requestAnimationFrame(() => (ready.value = true))
  observer = new ResizeObserver(measure)
  if (track.value) observer.observe(track.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    ref="track"
    role="tablist"
    class="relative flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-gray-900/[0.05] p-0.5 [scrollbar-width:none] dark:bg-white/[0.06] [&::-webkit-scrollbar]:hidden"
    :class="stretch ? 'w-full' : 'w-fit'"
  >
    <span
      v-if="thumb && thumb.w"
      aria-hidden="true"
      class="pointer-events-none absolute bottom-0.5 left-0 top-0.5 rounded-lg bg-white shadow-[0_1px_2px_rgb(17_17_19/0.08),0_0_0_0.5px_rgb(17_17_19/0.06)] motion-reduce:transition-none dark:bg-white/[0.12] dark:shadow-[inset_0_0.5px_0_rgb(255_255_255/0.1)]"
      :class="
        ready
          ? 'transition-[transform,width] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]'
          : ''
      "
      :style="{ transform: `translateX(${thumb.x}px)`, width: `${thumb.w}px` }"
    />
    <button
      v-for="tab in tabs"
      :key="tab"
      type="button"
      role="tab"
      :aria-selected="active === tab"
      :disabled="disabled[tab]"
      :title="titles[tab]"
      class="relative cursor-pointer whitespace-nowrap rounded-lg font-medium disabled:cursor-not-allowed disabled:opacity-50"
      :class="[
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
        stretch ? 'flex-1' : 'shrink-0',
        active === tab
          ? 'text-gray-900 dark:text-gray-50'
          : 'text-gray-500 enabled:hover:text-gray-800 dark:text-gray-400 dark:enabled:hover:text-gray-200',
      ]"
      @click="emit('select', tab)"
    >
      {{ labels[tab] }}
    </button>
  </div>
</template>
