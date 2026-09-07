import { computed, ref, type Ref } from 'vue'
import { useEntries } from '@/composables/useEntries'
import { checkPasswordBreach } from '@/composables/useBreachCheck'
import { isAuditable, type VaultPassword } from '@/api/vault'
import { scoreDeep, WEAK_THRESHOLD } from '@/services/passwordStrength'

export { WEAK_THRESHOLD }

export type SecurityScope = 'personal' | 'organization'

// Session-level cache so revisiting the Security Center doesn't re-query HIBP for passwords already checked
// Keyed by the password itself; it never leaves the client (only the SHA-1 prefix does, inside checkPasswordBreach)
const breachCache = new Map<string, boolean>()

const BREACH_CONCURRENCY = 4

// Deep scoring is synchronous CPU work once the dictionaries are in. Awaiting it only drains the
// microtask queue, so without a real macrotask break a few hundred entries freeze the page
const DEEP_SCORE_YIELD_EVERY = 20
const yieldToPaint = () => new Promise((resolve) => setTimeout(resolve, 0))

export function useSecurityAudit(scope: Ref<SecurityScope> = ref('personal')) {
  const vault = useEntries()

  const auditable = computed<VaultPassword[]>(() => vault.passwords.filter(isAuditable))

  function inScope(list: VaultPassword[]): VaultPassword[] {
    if (scope.value === 'personal') return list.filter((e) => !e.shared)
    if (scope.value === 'organization') return list.filter((e) => e.shared)
    return list
  }

  const passwords = computed<VaultPassword[]>(() => inScope(auditable.value))

  const excludedCount = computed<number>(
    () => inScope(vault.passwords.filter((e) => e.password && e.excludeFromAnalytics)).length,
  )

  const reusedGroups = computed<VaultPassword[][]>(() => {
    const map = new Map<string, VaultPassword[]>()
    for (const e of passwords.value) {
      if (!e.password) continue
      const list = map.get(e.password) ?? []
      list.push(e)
      map.set(e.password, list)
    }
    return [...map.values()].filter((list) => list.length > 1)
  })

  const reused = computed<VaultPassword[]>(() => reusedGroups.value.flat())
  const weak = computed<VaultPassword[]>(() =>
    passwords.value.filter((e) => e.passwordStrength < WEAK_THRESHOLD),
  )

  // Entries arrive scored by scoreSync, which cannot see dictionary words or keyboard walks and so
  // over-rates them. Refining here — rather than on decrypt — keeps the zxcvbn chunk and its
  // ~10-50ms per password off the vault-load path
  const deepScoring = ref(false)

  async function runDeepScoring(): Promise<void> {
    if (deepScoring.value) return
    deepScoring.value = true
    try {
      const unique = [...new Set(auditable.value.map((e) => e.password))]
      const scores = new Map<string, number>()
      for (const [i, pw] of unique.entries()) {
        scores.set(pw, await scoreDeep(pw))
        if (i % DEEP_SCORE_YIELD_EVERY === DEEP_SCORE_YIELD_EVERY - 1) await yieldToPaint()
      }
      for (const e of auditable.value) {
        const score = scores.get(e.password)
        if (score !== undefined) e.passwordStrength = score
      }
    } finally {
      deepScoring.value = false
    }
  }

  const breachedPasswords = ref(new Set<string>())
  const breachProgress = ref(0)
  const breachTotal = ref(0)
  const checkingBreaches = ref(false)

  const breached = computed<VaultPassword[]>(() =>
    passwords.value.filter((e) => breachedPasswords.value.has(e.password)),
  )

  async function runBreachScan(): Promise<void> {
    if (checkingBreaches.value) return
    const unique = [...new Set(auditable.value.map((e) => e.password))]
    breachTotal.value = unique.length
    breachProgress.value = 0
    checkingBreaches.value = true

    const queue = [...unique]
    async function worker() {
      for (let pw = queue.shift(); pw !== undefined; pw = queue.shift()) {
        let isBreached = breachCache.get(pw)
        if (isBreached === undefined) {
          try {
            isBreached = await checkPasswordBreach(pw)
            breachCache.set(pw, isBreached)
          } catch {
            isBreached = false
          }
        }
        if (isBreached) {
          breachedPasswords.value = new Set(breachedPasswords.value).add(pw)
        }
        breachProgress.value++
      }
    }

    try {
      await Promise.all(Array.from({ length: BREACH_CONCURRENCY }, worker))
    } finally {
      checkingBreaches.value = false
    }

    // Sync the per-entry flag so detail views agree with the audit
    for (const e of auditable.value) {
      e.breached = breachedPasswords.value.has(e.password)
    }
  }

  // Per-entry severity: breached outranks reused outranks weak; an entry counts once
  // Safety score is the weighted share of healthy entries
  const safetyScore = computed<number>(() => {
    const total = passwords.value.length
    if (total === 0) return 100
    const reusedSet = new Set(reused.value.map((e) => e.id))
    let penalty = 0
    for (const e of passwords.value) {
      if (breachedPasswords.value.has(e.password)) penalty += 1
      else if (reusedSet.has(e.id)) penalty += 0.6
      else if (e.passwordStrength < WEAK_THRESHOLD) penalty += 0.4
    }
    return Math.round(100 * (1 - penalty / total))
  })

  return {
    passwords,
    excludedCount,
    reused,
    reusedGroups,
    weak,
    breached,
    safetyScore,
    checkingBreaches,
    breachProgress,
    breachTotal,
    runBreachScan,
    deepScoring,
    runDeepScoring,
  }
}
