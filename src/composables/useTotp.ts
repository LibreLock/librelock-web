import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { showNextCode } from '@/composables/useTotpPrefs'
import { generateTotp, parseOtpInput, secondsRemaining, type TotpParams } from '@/services/totp'

// One shared clock for every code on screen: the Authenticator page can show dozens of codes and
// must not run an interval for each. It ticks only while at least one subscriber is alive.
const now = ref(Date.now())
let subscribers = 0
let timer: ReturnType<typeof setInterval> | null = null

function subscribe() {
  subscribers++
  now.value = Date.now()
  timer ??= setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

function unsubscribe() {
  subscribers = Math.max(0, subscribers - 1)
  if (subscribers === 0 && timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

/** Live one-time code for an otpauth:// URI (or raw key). `code` is '' until it is computed or if invalid. */
export function useTotp(source: MaybeRefOrGetter<string | null | undefined>) {
  if (getCurrentScope()) {
    subscribe()
    onScopeDispose(unsubscribe)
  }

  const params = computed<TotpParams | null>(() => {
    const text = toValue(source)
    if (!text) return null
    const parsed = parseOtpInput(text)
    return parsed.ok ? parsed.params : null
  })

  const period = computed(() => params.value?.period ?? 30)
  const remaining = computed(() => secondsRemaining(period.value, now.value))
  // The code only changes when the window rolls over, so key the recompute on the counter
  const counter = computed(() => Math.floor(now.value / 1000 / period.value))

  const code = ref('')
  let latest = 0
  watch(
    [params, counter],
    async ([p]) => {
      if (!p) {
        code.value = ''
        return
      }
      const ticket = ++latest
      const next = await generateTotp(p, now.value)
      // A slower, older computation must never overwrite a newer one
      if (ticket === latest) code.value = next
    },
    { immediate: true },
  )

  // The following window's code, only worked out while the setting is on
  const nextCode = ref('')
  let nextLatest = 0
  watch(
    [params, counter, showNextCode],
    async ([p, , on]) => {
      if (!p || !on) {
        nextCode.value = ''
        return
      }
      const ticket = ++nextLatest
      const next = await generateTotp(p, now.value + p.period * 1000)
      if (ticket === nextLatest) nextCode.value = next
    },
    { immediate: true },
  )

  return {
    params,
    code,
    nextCode,
    remaining,
    period,
    valid: computed(() => params.value !== null),
  }
}
