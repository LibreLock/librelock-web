import { computed, ref, type Ref } from 'vue'
import { useEntries } from '@/composables/useEntries'
import { checkPasswordBreach } from '@/composables/useBreachCheck'
import type { VaultPassword } from '@/api/vault'

export const WEAK_THRESHOLD = 7 // below "Strong" on the 0-10 strength scale

export type SecurityScope = 'all' | 'personal' | 'organization'

// Session-level cache so revisiting the Security Center doesn't re-query HIBP for passwords already checked
// Keyed by the password itself; it never leaves the client (only the SHA-1 prefix does, inside checkPasswordBreach)
const breachCache = new Map<string, boolean>()

const BREACH_CONCURRENCY = 4

export function useSecurityAudit(scope: Ref<SecurityScope> = ref('all')) {
  const vault = useEntries()

  // Scoped to personal-only or organization-only entries when requested; breach scanning still covers everything so toggling scope never re-queries HIBP
  const passwords = computed<VaultPassword[]>(() => {
    if (scope.value === 'personal') return vault.passwords.filter((e) => !e.shared)
    if (scope.value === 'organization') return vault.passwords.filter((e) => e.shared)
    return vault.passwords
  })

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

  const breachedPasswords = ref(new Set<string>())
  const breachProgress = ref(0)
  const breachTotal = ref(0)
  const checkingBreaches = ref(false)

  const breached = computed<VaultPassword[]>(() =>
    passwords.value.filter((e) => breachedPasswords.value.has(e.password)),
  )

  // Checks every distinct password against HIBP (k-anonymity range API) with bounded concurrency
  // Always covers all entries (not just the current scope) so switching scope later never re-triggers a scan
  // Results land incrementally so the UI fills in live
  async function runBreachScan(): Promise<void> {
    if (checkingBreaches.value) return
    const unique = [...new Set(vault.passwords.map((e) => e.password).filter(Boolean))]
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
    for (const e of vault.passwords) {
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
    reused,
    reusedGroups,
    weak,
    breached,
    safetyScore,
    checkingBreaches,
    breachProgress,
    breachTotal,
    runBreachScan,
  }
}
