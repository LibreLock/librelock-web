<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useEntries } from '@/composables/useEntries'
import type { VaultEntry } from '@/api/vault'
import { useCategoriesStore } from '@/stores/categories'
import { useOrgCategoriesStore } from '@/stores/orgCategories'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import CategoryPill from '@/components/CategoryPill.vue'
import CardNetworkLogo from '@/components/CardNetworkLogo.vue'
import EntryIcon from '@/components/EntryIcon.vue'
import { usePasswordGenerator } from '@/composables/usePasswordGenerator'
import { checkPasswordBreach } from '@/composables/useBreachCheck'
import { DEFAULT_COLOR, ENTRY_COLORS } from '@/constants'
import { detectCardNetwork } from '@/api/vault'
import { ICON_CATALOG, detectBrandIcon, getIcon } from '@/icons/catalog'
import IconGlyph from '@/components/IconGlyph.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import {
  SSO_OTHER,
  SSO_PROVIDERS,
  getSsoProvider,
  ssoLabel,
  suggestSsoProvider,
} from '@/services/sso'
import {
  SECTION_TYPE,
  deleteReturnRouteFor,
  originPath,
  originSection,
  returnRouteFor,
} from '@/router/origin'

const route = useRoute()
const router = useRouter()
const vault = useEntries()
const categoriesStore = useCategoriesStore()
const orgCategoriesStore = useOrgCategoriesStore()
const auth = useAuthStore()
const orgStore = useOrganizationStore()

const editId = route.params.id as string | undefined
const isEditMode = Boolean(editId)
const editingEntry = ref<VaultEntry | null>(null)

// The page this form was opened from; saving and deleting return there. Read once at setup, while
// history.state.back still points at it and before this form pushes anywhere.
const origin = originPath()
const originList = originSection(router)

// Scope: personal vault vs the organization shared vault
// Chosen at creation, and on edit an entry may be moved either way between the two
// Only shown when the user has shared access
// Opened from the Shared tab: default to a shared entry so it lands back in that list (edit mode
// overwrites this from the entry itself)
const isShared = ref(originList === 'shared')
const canShare = computed(() => vault.hasOrgAccess)

const wasShared = computed(() => isEditMode && editingEntry.value?.shared === true)

// What the shared vault lets this user do, from Organization -> Management -> Access. Admins and
// owners always may; for everyone else the server enforces the same two rules on the org-vault
// routes, so these computeds only decide what the form offers
const canManageShared = computed(() => auth.isAdmin || orgStore.memberManageShared)
const canEditShared = computed(() => auth.isAdmin || orgStore.memberEditShared)

const canChooseScope = computed(() => canShare.value)
// Both directions are a manage action: one adds an entry to the shared vault, the other takes one
// away from everyone else. Shown rather than hidden when policy forbids it, so the reason is visible
const makePrivateBlocked = computed(() => wasShared.value && !canManageShared.value)
const shareBlocked = computed(() => !wasShared.value && !canManageShared.value)

// Reachable only by someone who may manage the entry (the load path turns everyone else away):
// they can move it out or delete it, but not rewrite it in place
const editBlocked = computed(() => wasShared.value && isShared.value && !canEditShared.value)
// Such a member is in the form for the actions they do have - delete, or move the entry out - so the
// fields themselves are read-only rather than merely unsaveable. Flipping to Private lifts it: the
// entry is becoming their own copy at that point
const readOnly = computed(() => editBlocked.value)
const saveBlocked = computed(() => editBlocked.value || (isShared.value && shareBlocked.value))

// Moving out of the shared vault: every member with access has already seen the secret, so the save
// is gated on a dialog that offers to rotate it
const isDemoting = computed(() => wasShared.value && !isShared.value)

// New entries in org mode when the user has no shared-vault access: nudge to where sharing is turned on
// Admins can enable it (Organization -> Users); members must ask an admin
const showSharingHint = computed(() => !isEditMode && orgStore.isOrganization && !canShare.value)

// Categories come from the org store for shared entries, the personal store otherwise
// Shared categories change what everyone sees and what entries are filed under, so they take both
// shared-vault permissions rather than either one alone
const activeCategories = computed(() =>
  isShared.value ? orgCategoriesStore.categories : categoriesStore.categories,
)
const canEditCategories = computed(() =>
  isShared.value ? canManageShared.value && canEditShared.value : true,
)

// The whole picker goes dead without those two permissions, rather than explaining itself: nothing
// here is actionable, including filing this entry under an existing category
const categoriesLocked = computed(() => readOnly.value || !canEditCategories.value)

type EntryType = 'password' | 'note' | 'card'

const ENTRY_TYPES: EntryType[] = ['password', 'card', 'note']

// A single-type list asks for its own type via ?type=; All Items sends none and gets the default.
// Unlike the origin, this belongs in the URL: it selects what the form edits, so the link is
// shareable and survives a reload.
function requestedType(): EntryType | null {
  const type = route.query.type
  return ENTRY_TYPES.find((t) => t === type) ?? null
}

// Without ?type=, fall back to the list the form was opened from — that covers the topbar's Add
// entry button and the `n` shortcut, which are global and carry no type of their own
const entryType = ref<EntryType>(
  requestedType() ?? (originList && SECTION_TYPE[originList]) ?? 'password',
)
const selectedColor = ref(DEFAULT_COLOR)
const selectedIcon = ref<string | null>(null)
const selectedCategoryId = ref<string | null>(null)

// Name/url used to preview brand auto-detection when no icon is chosen
const iconName = computed(() =>
  entryType.value === 'password'
    ? account.name
    : entryType.value === 'note'
      ? note.name
      : card.name,
)
const iconUrl = computed(() => (entryType.value === 'password' ? account.url : ''))

type IconTab = 'all' | 'brands' | 'general'
const ICON_TABS: { id: IconTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'brands', label: 'Brands' },
  { id: 'general', label: 'General' },
]
const iconTab = ref<IconTab>('brands')
const iconSearch = ref('')
const filteredIcons = computed(() => {
  const q = iconSearch.value.trim().toLowerCase()
  return ICON_CATALOG.filter((ic) => {
    if (iconTab.value === 'brands' && ic.group !== 'Brands') return false
    if (iconTab.value === 'general' && ic.group !== 'General') return false
    if (!q) return true
    return ic.label.toLowerCase().includes(q) || ic.keywords.some((k) => k.includes(q))
  })
})

// A query typed under the Brands tab would silently hide matching general icons, so the first
// keystroke widens the search to All. Only on the empty -> typed edge, so a tab picked while
// searching sticks.
watch(iconSearch, (q, prev) => {
  if (q.trim() && !prev.trim()) iconTab.value = 'all'
})

// Drop a selected category that no longer exists in the active list
// Also fires when scope flips, since personal and shared categories are separate spaces
watch(activeCategories, (cats) => {
  if (selectedCategoryId.value && !cats.some((c) => c.id === selectedCategoryId.value)) {
    selectedCategoryId.value = null
  }
})

// Opened from the Shared list by someone who may not add to it (or arriving before /organization
// has landed): fall back to a private entry rather than offering a save the server would refuse
watch([shareBlocked, isShared], () => {
  if (shareBlocked.value && isShared.value && !wasShared.value) isShared.value = false
})

// Switching scope invalidates the current category (different namespace)
watch(isShared, () => {
  selectedCategoryId.value = null
  showNewCategory.value = false
})

const showPassword = ref(false)
const showCvv = ref(false)

const account = reactive({
  name: '',
  username: '',
  email: '',
  password: '',
  url: '',
  notes: '',
  ssoProvider: '',
  ssoLabel: '',
  ssoEntryId: null as string | null,
  excludeFromAnalytics: false,
})

const usesSso = computed(() => account.ssoProvider !== '')

const showAdvanced = ref(false)

const advancedSummary = computed(() => {
  const parts: string[] = []
  if (usesSso.value) parts.push(ssoLabel(account.ssoProvider, account.ssoLabel))
  if (linkedEntry.value) parts.push(`via ${linkedEntry.value.name}`)
  if (account.excludeFromAnalytics) parts.push('excluded from analytics')
  return parts.join(' · ')
})

function ssoGlyph(providerId: string) {
  return getIcon(getSsoProvider(providerId)?.icon)
}

const suggestedProvider = computed(() =>
  account.ssoProvider ? null : suggestSsoProvider(account.email, account.username),
)

const ssoMenuOpen = ref(false)
const ssoSearch = ref('')
const ssoHighlight = ref(0)
const ssoMenu = ref<HTMLElement | null>(null)
const ssoPanel = ref<HTMLElement | null>(null)
const ssoSearchInput = ref<HTMLInputElement | null>(null)

const ssoMenuStyle = ref<Record<string, string>>({})
const MIN_MENU_SPACE = 180

function positionSsoMenu() {
  const trigger = ssoMenu.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const below = window.innerHeight - rect.bottom - 8
  const above = rect.top - 8
  const flip = below < MIN_MENU_SPACE && above > below

  ssoMenuStyle.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.min(320, Math.max(flip ? above : below, MIN_MENU_SPACE))}px`,
    ...(flip
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` }),
  }
}

interface SsoOption {
  id: string
  label: string
  icon: string | null
}

const ssoOptions = computed<SsoOption[]>(() => {
  const options: SsoOption[] = [{ id: '', label: 'No SSO', icon: null }, ...SSO_PROVIDERS]
  const q = ssoSearch.value.trim().toLowerCase()
  if (!q) return options
  return options.filter((o) => o.label.toLowerCase().includes(q) || o.id.includes(q))
})

const selectedSsoLabel = computed(() =>
  usesSso.value ? ssoLabel(account.ssoProvider, account.ssoLabel) : 'No SSO',
)

async function openSsoMenu() {
  ssoMenuOpen.value = true
  ssoSearch.value = ''
  ssoHighlight.value = Math.max(
    0,
    ssoOptions.value.findIndex((o) => o.id === account.ssoProvider),
  )
  positionSsoMenu()
  await nextTick()
  ssoSearchInput.value?.focus()
}

function closeSsoMenu() {
  ssoMenuOpen.value = false
}

function pickSso(id: string) {
  account.ssoProvider = id
  closeSsoMenu()
}

// Typing narrows the list, so the highlight has to come back into range
watch(ssoSearch, () => (ssoHighlight.value = 0))

async function moveSsoHighlight(delta: number) {
  const count = ssoOptions.value.length
  if (count === 0) return
  ssoHighlight.value = (ssoHighlight.value + delta + count) % count
  await nextTick()
  ssoPanel.value
    ?.querySelectorAll('[role="option"]')
    [ssoHighlight.value]?.scrollIntoView({ block: 'nearest' })
}

function chooseHighlightedSso() {
  const option = ssoOptions.value[ssoHighlight.value]
  if (option) pickSso(option.id)
}

function handleSsoOutsideClick(e: MouseEvent) {
  if (!ssoMenuOpen.value) return
  const target = e.target as Node
  if (ssoMenu.value?.contains(target) || ssoPanel.value?.contains(target)) return
  closeSsoMenu()
}

function handleSsoReflow() {
  if (ssoMenuOpen.value) positionSsoMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', handleSsoOutsideClick)
  window.addEventListener('scroll', handleSsoReflow, true)
  window.addEventListener('resize', handleSsoReflow)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleSsoOutsideClick)
  window.removeEventListener('scroll', handleSsoReflow, true)
  window.removeEventListener('resize', handleSsoReflow)
  clearTimeout(passwordCopiedTimer)
  clearTimeout(rotationCopiedTimer)
  clearTimeout(breachTimer)
  clearTimeout(candidateBreachTimer)
})

const linkCandidates = computed(() => {
  const provider = account.ssoProvider
  return vault.passwords
    .filter((e) => e.id !== editId && e.password)
    .map((e) => ({
      entry: e,
      matches: detectBrandIcon(e.name, e.url)?.id === provider,
    }))
    .sort((a, b) => {
      if (a.matches !== b.matches) return a.matches ? -1 : 1
      return a.entry.name.localeCompare(b.entry.name)
    })
    .map((c) => c.entry)
})

const linkedEntry = computed(() =>
  account.ssoEntryId ? (vault.getEntry(account.ssoEntryId) ?? null) : null,
)

const hasOwnPassword = computed(() => account.password.length > 0)

// Saving into the shared vault while the login lives in a private entry: the link resolves for the
// owner (both vaults are searched) but for every other member it points at something they cannot
// see, so the fall-through gives them nothing
const linksToPrivateEntry = computed(
  () =>
    entryType.value === 'password' &&
    isShared.value &&
    linkedEntry.value !== null &&
    !linkedEntry.value.shared,
)

// Entries that sign in through this one. Nothing can point at a new entry yet, so the scan is
// skipped there; while editing it is one pass over the loaded passwords, cached until they change
const linkers = computed(() =>
  isEditMode ? vault.passwords.filter((e) => e.id !== editId && e.ssoEntryId === editId) : [],
)

// The shared ones among them: after a move to the private vault they point at an entry only its
// owner can resolve
const sharedLinkers = computed(() => linkers.value.filter((e) => e.shared))

function candidateLabel(entry: (typeof linkCandidates.value)[number]): string {
  const who = entry.username || entry.email
  return who ? `${entry.name} — ${who}` : entry.name
}

watch(usesSso, (uses) => {
  if (!uses) account.ssoEntryId = null
})

watch(
  () => account.ssoProvider,
  (id) => {
    if (id !== SSO_OTHER) account.ssoLabel = ''
  },
)

const note = reactive({
  name: '',
  content: '',
})

const card = reactive({
  name: '',
  cardholderName: '',
  cardNumber: '',
  expiration: '',
  cvv: '',
  notes: '',
})

const passwordCopied = ref(false)
let passwordCopiedTimer: ReturnType<typeof setTimeout> | undefined
const canCopyPassword = computed(() => account.password.length > 0)

async function copyPassword() {
  await navigator.clipboard.writeText(account.password)
  passwordCopied.value = true
  clearTimeout(passwordCopiedTimer)
  passwordCopiedTimer = setTimeout(() => (passwordCopied.value = false), 2000)
}

const cardNetwork = computed(() => detectCardNetwork(card.cardNumber))

function handleCardNumberInput(e: Event) {
  const input = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 16)
  card.cardNumber = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  input.value = card.cardNumber
}

function handleExpiryInput(e: Event) {
  const input = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 4)
  card.expiration = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  input.value = card.expiration
}

const isSubmitting = ref(false)
const isLoading = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
const showLeaveConfirm = ref(false)
const showPrivateLinkConfirm = ref(false)
const showExposureConfirm = ref(false)
const rotationCandidate = ref('')
const rotationCopied = ref(false)
let rotationCopiedTimer: ReturnType<typeof setTimeout> | undefined
const error = ref<string | null>(null)

const showNewCategory = ref(false)
const newCategoryName = ref('')
const isAddingCategory = ref(false)

const { generated, generate } = usePasswordGenerator()

function generateStrongPassword() {
  generate()
  account.password = generated.value
}

// The exposure dialog offers a replacement for a secret the whole team has already seen. It is
// generated when the dialog opens so the user can copy it before the entry moves
// An SSO-only entry has no password of its own, and a card's number comes from its issuer: neither
// can be rotated here, so those get the warning alone
const canRotate = computed(() => entryType.value === 'password' && account.password.length > 0)
const exposureConfirmLabel = computed(() =>
  canRotate.value ? 'Change password & make private' : 'Make private',
)

function offerRotation() {
  generate()
  rotationCandidate.value = generated.value
  rotationCopied.value = false
}

async function copyRotationCandidate() {
  await navigator.clipboard.writeText(rotationCandidate.value)
  rotationCopied.value = true
  clearTimeout(rotationCopiedTimer)
  rotationCopiedTimer = setTimeout(() => (rotationCopied.value = false), 2000)
}

function rotateAndMakePrivate() {
  account.password = rotationCandidate.value
  handleSubmit({ exposure: true })
}

function makePrivateWithoutRotating() {
  handleSubmit({ exposure: true })
}

// Live security signals for the password being typed: reuse against the loaded vault(s) and a debounced HIBP breach check
const reusedWith = computed(() =>
  account.password
    ? vault.passwords.filter(
        (e) => e.id !== editId && e.password === account.password && !e.excludeFromAnalytics,
      )
    : [],
)

const showReusedTooltip = ref(false)
const breachStatus = ref<'idle' | 'checking' | 'breached' | 'clean'>('idle')
let breachTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => account.password,
  (pw) => {
    clearTimeout(breachTimer)
    if (!pw) {
      breachStatus.value = 'idle'
      return
    }
    breachStatus.value = 'checking'
    breachTimer = setTimeout(async () => {
      try {
        const breached = await checkPasswordBreach(pw)
        if (account.password === pw) breachStatus.value = breached ? 'breached' : 'clean'
      } catch {
        if (account.password === pw) breachStatus.value = 'idle'
      }
    }, 600)
  },
)

// Same signals for the replacement offered in the exposure dialog: a rotation that lands on a
// reused or breached password has not bought anything
const candidateReusedWith = computed(() =>
  rotationCandidate.value
    ? vault.passwords.filter(
        (e) => e.id !== editId && e.password === rotationCandidate.value && !e.excludeFromAnalytics,
      )
    : [],
)

const showCandidateReusedTooltip = ref(false)
const candidateBreachStatus = ref<'idle' | 'checking' | 'breached' | 'clean'>('idle')
let candidateBreachTimer: ReturnType<typeof setTimeout> | undefined

watch(rotationCandidate, (pw) => {
  clearTimeout(candidateBreachTimer)
  if (!pw) {
    candidateBreachStatus.value = 'idle'
    return
  }
  candidateBreachStatus.value = 'checking'
  candidateBreachTimer = setTimeout(async () => {
    try {
      const breached = await checkPasswordBreach(pw)
      if (rotationCandidate.value === pw)
        candidateBreachStatus.value = breached ? 'breached' : 'clean'
    } catch {
      if (rotationCandidate.value === pw) candidateBreachStatus.value = 'idle'
    }
  }, 600)
})

// The Name input of whichever type's form is rendered (only one branch exists at a time)
const nameInput = ref<HTMLInputElement | null>(null)

async function focusName() {
  await nextTick()
  nameInput.value?.focus()
}

onMounted(async () => {
  categoriesStore.fetchCategories()
  if (canShare.value) orgCategoriesStore.fetchCategories()
  if (!isEditMode) {
    // Load entries anyway so the reused-password indicator has data
    vault.fetchAll()
    // Straight into typing on a new entry; editing keeps the caret free so the existing values
    // are not at risk of being overwritten by a stray keystroke
    focusName()
    return
  }
  isLoading.value = true
  try {
    await vault.fetchAll()
    const entry = vault.getEntry(editId!)
    if (!entry) {
      error.value = 'Entry not found.'
      return
    }
    // The form is a write surface: a shared entry the user may neither edit nor manage is not
    // theirs to open, however they got here - typed URL, history, a stale link. Send them to the
    // entry itself, where reading and copying are still allowed
    if (entry.shared && !canEditShared.value && !canManageShared.value) {
      leaveOnPurpose(() => router.replace(returnRouteFor(originList, origin, entry)))
      return
    }
    editingEntry.value = entry
    isShared.value = entry.shared
    entryType.value = entry.type
    selectedColor.value = entry.color
    selectedIcon.value = entry.icon
    selectedCategoryId.value = entry.categoryId
    if (entry.type === 'password') {
      account.name = entry.name
      account.username = entry.username
      account.email = entry.email
      account.password = entry.password
      account.url = entry.url
      account.notes = entry.notes
      account.ssoProvider = entry.ssoProvider ?? ''
      account.ssoLabel = entry.ssoLabel
      account.ssoEntryId = entry.ssoEntryId
      account.excludeFromAnalytics = entry.excludeFromAnalytics
      showAdvanced.value = Boolean(entry.ssoProvider) || entry.excludeFromAnalytics
    } else if (entry.type === 'card') {
      card.name = entry.name
      card.cardholderName = entry.cardholderName
      card.cardNumber = entry.cardNumber
      card.expiration = entry.expiration
      card.cvv = entry.cvv
      card.notes = entry.notes
    } else {
      note.name = entry.name
      note.content = entry.content
    }
    // The loaded entry is what "unchanged" means from here on
    pristine = snapshot()
  } catch {
    error.value = 'Failed to load entry.'
  } finally {
    isLoading.value = false
  }
})

// Everything the user can change, flattened for comparison. Covers the inactive types too, so
// text typed before switching type still counts as unsaved work.
function snapshot() {
  return JSON.stringify({
    entryType: entryType.value,
    isShared: isShared.value,
    color: selectedColor.value,
    icon: selectedIcon.value,
    categoryId: selectedCategoryId.value,
    account,
    card,
    note,
  })
}

// Empty form for a new entry, the loaded entry when editing (reassigned once it arrives)
let pristine = snapshot()
const isDirty = () => snapshot() !== pristine

// Saving, deleting and a confirmed discard all navigate on purpose, so they lift the guard for
// the one move they make rather than answering their own dialog
let leavingOnPurpose = false
function leaveOnPurpose(go: () => void) {
  leavingOnPurpose = true
  go()
}

// Where the blocked navigation was headed, held while the dialog is up so Discard can finish it
let pendingLeave: string | null = null

// Any way out of a dirty form - the sidebar, Add entry, the back button, a typed URL - stops at
// the same dialog; a clean form leaves without comment
onBeforeRouteLeave((to) => {
  if (leavingOnPurpose || !isDirty()) return true
  pendingLeave = to.fullPath
  showLeaveConfirm.value = true
  return false
})

// Leave without saving. Going back rather than pushing keeps the previous page as it was —
// same scroll, same selected entry — and leaves no dead form entry in the history.
function discardAndLeave() {
  showLeaveConfirm.value = false
  const target = pendingLeave
  pendingLeave = null
  leaveOnPurpose(() => {
    // Where the user was actually headed when the guard stopped them wins over the form's own exit
    if (target) router.push(target)
    else if (origin) router.back()
    else router.replace(deleteReturnRouteFor(originList, origin, isShared.value))
  })
}

function keepEditing() {
  pendingLeave = null
  showLeaveConfirm.value = false
}

function leaveForm() {
  if (isDirty()) showLeaveConfirm.value = true
  else discardAndLeave()
}

// Discard takes focus with the dialog, so a second Escape or an Enter carries the exit through
const discardButton = ref<HTMLButtonElement | null>(null)
watch(showLeaveConfirm, async (open) => {
  if (!open) return
  await nextTick()
  discardButton.value?.focus()
})

const privateLinkButton = ref<HTMLButtonElement | null>(null)
watch(showPrivateLinkConfirm, async (open) => {
  if (!open) return
  await nextTick()
  privateLinkButton.value?.focus()
})

const rotateButton = ref<HTMLButtonElement | null>(null)
watch(showExposureConfirm, async (open) => {
  if (!open) return
  if (canRotate.value) offerRotation()
  await nextTick()
  rotateButton.value?.focus()
})

// Capture phase, so the shortcuts work from inside the form's inputs too
function handleFormShortcuts(e: KeyboardEvent) {
  if (isLoading.value || isSubmitting.value) return

  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    if (
      showDeleteConfirm.value ||
      showLeaveConfirm.value ||
      showPrivateLinkConfirm.value ||
      showExposureConfirm.value
    )
      return
    e.preventDefault()
    e.stopPropagation()
    handleSubmit()
    return
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    // Escape backs out of whatever is innermost: an open dialog, then the new-category field,
    // then the form itself
    if (showDeleteConfirm.value) showDeleteConfirm.value = false
    else if (showExposureConfirm.value) showExposureConfirm.value = false
    else if (showPrivateLinkConfirm.value) showPrivateLinkConfirm.value = false
    else if (showLeaveConfirm.value) keepEditing()
    else if (ssoMenuOpen.value) closeSsoMenu()
    else if (showNewCategory.value) cancelNewCategory()
    else leaveForm()
  }
}

onMounted(() => window.addEventListener('keydown', handleFormShortcuts, true))
onBeforeUnmount(() => window.removeEventListener('keydown', handleFormShortcuts, true))

function switchType(type: EntryType) {
  entryType.value = type
  error.value = null
  // The old Name input is unmounted with its branch, so hand focus to the new one
  focusName()
}

function cancelNewCategory() {
  showNewCategory.value = false
  newCategoryName.value = ''
}

async function handleAddCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  isAddingCategory.value = true
  try {
    const store = isShared.value ? orgCategoriesStore : categoriesStore
    const cat = await store.addCategory(name)
    selectedCategoryId.value = cat.id
    newCategoryName.value = ''
    showNewCategory.value = false
  } finally {
    isAddingCategory.value = false
  }
}

async function handleDelete() {
  if (!editingEntry.value) return
  isDeleting.value = true
  try {
    const wasShared = editingEntry.value.shared
    await vault.removeEntry(editingEntry.value)
    leaveOnPurpose(() => router.replace(deleteReturnRouteFor(originList, origin, wasShared)))
  } finally {
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}

// Two independent gates, each answered by its own dialog; a confirmed one is carried forward so
// answering the second never re-asks the first
async function handleSubmit(confirmed: { exposure?: boolean; privateLink?: boolean } = {}) {
  if (isDemoting.value && !confirmed.exposure) {
    showExposureConfirm.value = true
    return
  }
  // The one case a share cannot fix by itself; everything else about the move is silent
  if (linksToPrivateEntry.value && !confirmed.privateLink) {
    showPrivateLinkConfirm.value = true
    return
  }
  showExposureConfirm.value = false
  showPrivateLinkConfirm.value = false
  error.value = null
  isSubmitting.value = true
  try {
    const meta = {
      color: selectedColor.value,
      icon: selectedIcon.value,
      categoryId: selectedCategoryId.value,
    }
    let payload
    if (entryType.value === 'password') {
      payload = {
        type: 'password' as const,
        ...account,
        ssoProvider: account.ssoProvider || null,
        ssoLabel: account.ssoProvider === SSO_OTHER ? account.ssoLabel.trim() : '',
        ...meta,
      }
    } else if (entryType.value === 'card') {
      payload = { type: 'card' as const, ...card, ...meta }
    } else {
      payload = { type: 'note' as const, ...note, ...meta }
    }
    if (isEditMode && editingEntry.value) {
      // A scope change moves the entry across vaults rather than editing it in place
      const promoting = !editingEntry.value.shared && isShared.value
      const demoting = editingEntry.value.shared && !isShared.value
      let updated
      if (promoting) updated = await vault.promoteToShared(editingEntry.value, payload)
      else if (demoting) updated = await vault.demoteToPrivate(editingEntry.value, payload)
      else updated = await vault.editEntry(editingEntry.value, payload)
      leaveOnPurpose(() => router.push(returnRouteFor(originList, origin, updated)))
    } else {
      const created = await vault.addEntry(payload, isShared.value)
      leaveOnPurpose(() => router.push(returnRouteFor(originList, origin, created)))
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save entry'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="overflow-y-auto h-full p-4 sm:p-6">
    <div class="w-full">
      <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ isEditMode ? 'Edit entry' : 'New' }}
          </h1>
        </div>

        <div
          v-if="!isEditMode"
          class="flex w-fit gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 shrink-0"
        >
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              entryType === 'password'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            :disabled="readOnly"
            @click="switchType('password')"
          >
            Password
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              entryType === 'card'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            :disabled="readOnly"
            @click="switchType('card')"
          >
            Card
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              entryType === 'note'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            :disabled="readOnly"
            @click="switchType('note')"
          >
            Secure Note
          </button>
        </div>

        <!-- Scope: choosable at creation and when promoting a private entry. -->
        <div
          v-if="canChooseScope"
          class="flex w-fit gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 shrink-0"
        >
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              !isShared
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            :disabled="makePrivateBlocked"
            :title="
              makePrivateBlocked
                ? 'Only admins can move a shared entry back to a private vault'
                : undefined
            "
            @click="isShared = false"
          >
            Private
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              isShared
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            :disabled="shareBlocked"
            :title="shareBlocked ? 'Only admins can add entries to the shared vault' : undefined"
            @click="isShared = true"
          >
            Shared
          </button>
        </div>

        <span
          v-if="wasShared && !canChooseScope"
          class="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-semibold"
        >
          Shared
        </span>

        <button
          v-if="isEditMode && !(wasShared && !canManageShared)"
          type="button"
          class="ml-auto rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          @click="showDeleteConfirm = true"
        >
          Delete
        </button>
      </div>

      <p
        v-if="isDemoting"
        class="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300"
      >
        Saving moves this entry into your private vault. Organization members have already seen the
        <span v-if="entryType === 'password'">password</span>
        <span v-else>note</span>
        so <strong>make sure to change it!</strong>
      </p>

      <p
        v-if="isEditMode && isShared && !wasShared"
        class="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-xs text-blue-700 dark:text-blue-300"
      >
        Saving moves this entry into the shared vault, where every member with access can see it.
      </p>

      <p
        v-if="showSharingHint"
        class="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400"
      >
        Organization vault sharing isn't enabled, so this entry saves to your private vault.
        <template v-if="auth.isAdmin">
          <RouterLink
            to="/organization#users"
            class="font-medium text-gray-700 dark:text-gray-200 underline hover:no-underline"
            >Enable it in Organization → Users</RouterLink
          >.
        </template>
        <template v-else> Ask an organization admin to grant you shared access. </template>
      </p>

      <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-400"
      >
        <LoadingSpinner class="text-gray-400" />
        Loading entry…
      </div>

      <div
        v-else
        class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden"
      >
        <form @submit.prevent="handleSubmit()">
          <div
            class="grid grid-cols-1 lg:grid-cols-[1fr_360px] lg:divide-x lg:divide-gray-100 dark:lg:divide-gray-700"
          >
            <div class="px-5 py-5 space-y-3">
              <template v-if="entryType === 'password'">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Name<span class="text-red-400">*</span></label
                  >
                  <input
                    :disabled="readOnly"
                    ref="nameInput"
                    v-model="account.name"
                    type="text"
                    required
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Username</label
                    >
                    <input
                      :disabled="readOnly"
                      v-model="account.username"
                      type="text"
                      class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Email</label
                    >
                    <input
                      :disabled="readOnly"
                      v-model="account.email"
                      type="email"
                      class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <div class="mb-1 flex items-center">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Password</label
                    >
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1"
                      >·</span
                    >
                    <button
                      type="button"
                      class="text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="readOnly"
                      @click="generateStrongPassword"
                    >
                      Generate
                    </button>
                  </div>
                  <div class="relative">
                    <input
                      :disabled="readOnly"
                      v-model="account.password"
                      :type="showPassword ? 'text' : 'password'"
                      autocomplete="new-password"
                      class="w-full rounded-md border px-3 py-1.5 font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                      :class="canCopyPassword ? 'pr-16' : 'pr-10'"
                    />
                    <div
                      class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2.5"
                    >
                      <!-- Copy stays available whether or not the value is revealed -->
                      <button
                        v-if="canCopyPassword"
                        type="button"
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        title="Copy password"
                        aria-label="Copy password"
                        @click="copyPassword"
                      >
                        <svg
                          v-if="!passwordCopied"
                          class="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <svg
                          v-else
                          class="h-4 w-4 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        :aria-label="showPassword ? 'Hide password' : 'Show password'"
                        :aria-pressed="showPassword"
                        @click="showPassword = !showPassword"
                      >
                        <svg
                          v-if="showPassword"
                          class="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                        <svg
                          v-else
                          class="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p v-if="!account.password && usesSso" class="mt-1.5 text-xs text-gray-400">
                    <template v-if="linkedEntry">
                      Password lives in {{ linkedEntry.name }}
                    </template>
                    <template v-else>
                      Signs in with {{ ssoLabel(account.ssoProvider, account.ssoLabel) }}
                    </template>
                  </p>

                  <div
                    v-if="account.password"
                    class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
                  >
                    <span
                      v-if="reusedWith.length > 0"
                      class="relative flex cursor-help items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400"
                      @mouseenter="showReusedTooltip = true"
                      @mouseleave="showReusedTooltip = false"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Reused by {{ reusedWith.length }} other
                      {{ reusedWith.length === 1 ? 'entry' : 'entries' }}

                      <span
                        v-if="showReusedTooltip"
                        class="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg"
                      >
                        <span
                          class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                          >Also used by</span
                        >
                        <span class="block space-y-0.5">
                          <span
                            v-for="e in reusedWith"
                            :key="e.id"
                            class="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300"
                          >
                            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"></span>
                            <span class="truncate">{{ e.name }}</span>
                          </span>
                        </span>
                      </span>
                    </span>
                    <span v-if="breachStatus === 'checking'" class="text-gray-400"
                      >Checking breaches…</span
                    >
                    <span
                      v-else-if="breachStatus === 'breached'"
                      class="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      Found in data breach
                    </span>
                    <span
                      v-else-if="breachStatus === 'clean'"
                      class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      No known breaches
                    </span>
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >URL</label
                  >
                  <input
                    :disabled="readOnly"
                    v-model="account.url"
                    type="text"
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Notes</label
                  >
                  <textarea
                    :disabled="readOnly"
                    v-model="account.notes"
                    rows="3"
                    class="w-full wrap-break-word resize-y field-sizing-content min-h-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    class="-mx-1 flex w-full items-center gap-2 px-1 py-1.5 text-left cursor-pointer"
                    :aria-expanded="showAdvanced"
                    aria-controls="entry-advanced"
                    @click="showAdvanced = !showAdvanced"
                  >
                    <svg
                      class="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform"
                      :class="showAdvanced ? 'rotate-90' : ''"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Advanced</span
                    >
                    <span
                      v-if="!showAdvanced && advancedSummary"
                      class="min-w-0 truncate text-xs text-gray-400"
                    >
                      {{ advancedSummary }}
                    </span>
                  </button>

                  <div v-show="showAdvanced" id="entry-advanced" class="space-y-5 pt-2">
                    <div>
                      <label
                        id="sso-label"
                        class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                        >Single sign-on</label
                      >
                      <div ref="ssoMenu" class="relative">
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-haspopup="listbox"
                          :aria-expanded="ssoMenuOpen"
                          aria-labelledby="sso-label"
                          :disabled="readOnly"
                          @click="ssoMenuOpen ? closeSsoMenu() : openSsoMenu()"
                        >
                          <IconGlyph
                            v-if="usesSso && ssoGlyph(account.ssoProvider)"
                            :icon="ssoGlyph(account.ssoProvider)"
                            class="h-4 w-4 shrink-0"
                          />
                          <span class="min-w-0 truncate" :class="usesSso ? '' : 'text-gray-400'">
                            {{ selectedSsoLabel }}
                          </span>
                          <span
                            v-if="suggestedProvider"
                            class="ml-auto shrink-0 text-xs text-emerald-600 dark:text-emerald-400"
                            :title="`Suggested by this entry's email`"
                          >
                            {{ getSsoProvider(suggestedProvider)?.label }}?
                          </span>
                          <svg
                            class="h-3.5 w-3.5 shrink-0 text-gray-400"
                            :class="suggestedProvider ? '' : 'ml-auto'"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        <Teleport to="body">
                          <div
                            v-if="ssoMenuOpen"
                            ref="ssoPanel"
                            class="fixed z-50 flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
                            :style="ssoMenuStyle"
                          >
                            <input
                              ref="ssoSearchInput"
                              v-model="ssoSearch"
                              type="text"
                              placeholder="Search providers…"
                              class="w-full shrink-0 border-b border-gray-100 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none"
                              @keydown.down.prevent="moveSsoHighlight(1)"
                              @keydown.up.prevent="moveSsoHighlight(-1)"
                              @keydown.enter.prevent="chooseHighlightedSso"
                            />
                            <ul role="listbox" class="min-h-0 flex-1 overflow-y-auto py-1">
                              <li v-for="(option, i) in ssoOptions" :key="option.id || 'none'">
                                <button
                                  type="button"
                                  role="option"
                                  :aria-selected="account.ssoProvider === option.id"
                                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer"
                                  :class="
                                    i === ssoHighlight
                                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                      : 'text-gray-700 dark:text-gray-300'
                                  "
                                  @mouseenter="ssoHighlight = i"
                                  @click="pickSso(option.id)"
                                >
                                  <IconGlyph
                                    v-if="ssoGlyph(option.id)"
                                    :icon="ssoGlyph(option.id)"
                                    class="h-4 w-4 shrink-0"
                                  />
                                  <span
                                    v-else
                                    class="h-4 w-4 shrink-0 text-center text-base leading-4 text-gray-300 dark:text-gray-600"
                                    aria-hidden="true"
                                    >/</span
                                  >
                                  <span class="min-w-0 truncate">{{ option.label }}</span>
                                  <span
                                    v-if="suggestedProvider === option.id"
                                    class="ml-auto shrink-0 text-xs text-emerald-600 dark:text-emerald-400"
                                    >suggested</span
                                  >
                                  <svg
                                    v-else-if="account.ssoProvider === option.id"
                                    class="ml-auto h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </button>
                              </li>
                              <li
                                v-if="ssoOptions.length === 0"
                                class="px-3 py-2 text-xs text-gray-400"
                              >
                                No provider matches “{{ ssoSearch.trim() }}”
                              </li>
                            </ul>
                          </div>
                        </Teleport>
                      </div>

                      <input
                        :disabled="readOnly"
                        v-if="account.ssoProvider === SSO_OTHER"
                        v-model="account.ssoLabel"
                        type="text"
                        placeholder="Provider name"
                        class="mt-2 w-full rounded-md border px-3 py-1.5 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <div v-if="usesSso" class="mt-2">
                        <label
                          for="sso-entry"
                          class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                          >Login entry</label
                        >
                        <select
                          :disabled="readOnly"
                          id="sso-entry"
                          v-model="account.ssoEntryId"
                          class="w-full rounded-md border px-3 py-1.5 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option :value="null">Not linked</option>
                          <option
                            v-if="account.ssoEntryId && !linkedEntry"
                            :value="account.ssoEntryId"
                          >
                            Linked entry not available
                          </option>
                          <option v-for="e in linkCandidates" :key="e.id" :value="e.id">
                            {{ candidateLabel(e) }}
                          </option>
                        </select>
                        <p v-if="!hasOwnPassword" class="mt-1 text-xs text-gray-400">
                          <template v-if="linkedEntry">
                            Copying this entry copies {{ linkedEntry.name }}'s password.
                          </template>
                          <template v-else>
                            Link the entry holding this provider's account to give this one
                            something to copy.
                          </template>
                        </p>
                      </div>
                    </div>

                    <div v-if="linkers.length > 0">
                      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Used for sign-in by
                      </p>
                      <p class="mt-0.5 text-xs text-gray-400">
                        {{ linkers.length }}
                        {{ linkers.length === 1 ? 'entry signs' : 'entries sign' }} in through with
                        this provider:
                      </p>
                      <ul class="mt-2 space-y-1">
                        <li
                          v-for="e in linkers"
                          :key="e.id"
                          class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                        >
                          <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="e.color"></span>
                          <span class="truncate">{{ e.name }}</span>
                          <span
                            v-if="e.shared"
                            class="shrink-0 rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-300"
                            >Shared</span
                          >
                        </li>
                      </ul>
                    </div>

                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Exclude from analytics
                        </p>
                        <p class="mt-0.5 text-xs text-gray-400">
                          Excludes this entry out of the Security Center score, weak, reused and
                          breached checks.
                        </p>
                      </div>
                      <ToggleSwitch
                        v-model="account.excludeFromAnalytics"
                        :disabled="readOnly"
                        class="mt-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <!-- Card form -->
              <template v-else-if="entryType === 'card'">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Name<span class="text-red-400">*</span></label
                  >
                  <input
                    :disabled="readOnly"
                    ref="nameInput"
                    v-model="card.name"
                    type="text"
                    required
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Cardholder name</label
                  >
                  <input
                    :disabled="readOnly"
                    v-model="card.cardholderName"
                    type="text"
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Card number<span class="text-red-400">*</span></label
                  >
                  <div class="relative">
                    <input
                      :disabled="readOnly"
                      :value="card.cardNumber"
                      type="text"
                      required
                      inputmode="numeric"
                      placeholder="1234 5678 9012 3456"
                      class="w-full rounded-md border px-3 py-1.5 pr-10 font-mono tracking-wider border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                      @input="handleCardNumberInput"
                    />
                    <div class="absolute right-3 top-1/2 -translate-y-1/2">
                      <CardNetworkLogo :network="cardNetwork" size="sm" />
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Expiration<span class="text-red-400">*</span></label
                    >
                    <input
                      :disabled="readOnly"
                      :value="card.expiration"
                      type="text"
                      required
                      inputmode="numeric"
                      placeholder="MM/YY"
                      maxlength="5"
                      class="w-full rounded-md border px-3 py-1.5 font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                      @input="handleExpiryInput"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >CVV<span class="text-red-400">*</span></label
                    >
                    <div class="relative">
                      <input
                        :disabled="readOnly"
                        v-model="card.cvv"
                        :type="showCvv ? 'text' : 'password'"
                        required
                        inputmode="numeric"
                        placeholder="•••"
                        maxlength="4"
                        class="w-full rounded-md border px-3 py-1.5 pr-10 font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        @click="showCvv = !showCvv"
                      >
                        <svg
                          v-if="showCvv"
                          class="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                        <svg
                          v-else
                          class="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Notes</label
                  >
                  <textarea
                    :disabled="readOnly"
                    v-model="card.notes"
                    rows="3"
                    class="w-full wrap-break-word resize-y field-sizing-content min-h-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </template>

              <template v-else>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Name<span class="text-red-400">*</span></label
                  >
                  <input
                    :disabled="readOnly"
                    ref="nameInput"
                    v-model="note.name"
                    type="text"
                    required
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Content<span class="text-red-400">*</span></label
                  >
                  <textarea
                    :disabled="readOnly"
                    v-model="note.content"
                    rows="8"
                    required
                    class="w-full wrap-break-word resize-y field-sizing-content min-h-44 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </template>
            </div>

            <div
              class="flex flex-col gap-5 px-5 py-5 border-t border-gray-100 dark:border-gray-700 lg:border-t-0"
            >
              <div>
                <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                  >Color</label
                >
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="c in ENTRY_COLORS"
                    :key="c.bg"
                    type="button"
                    class="h-6 w-6 rounded-full transition-transform cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    :class="[
                      c.bg,
                      selectedColor === c.bg
                        ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110'
                        : 'hover:scale-105',
                    ]"
                    :title="c.label"
                    :disabled="readOnly"
                    @click="selectedColor = c.bg"
                  />
                </div>
              </div>

              <div v-if="entryType !== 'card'">
                <div class="mb-1 flex items-center gap-2">
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Icon</label
                  >
                  <EntryIcon
                    v-if="iconName || selectedIcon"
                    :name="iconName"
                    :color="selectedColor"
                    :icon="selectedIcon"
                    :url="iconUrl"
                    size="sm"
                    class="h-7! w-7! rounded-md! text-xs!"
                  />
                </div>
                <input
                  v-model="iconSearch"
                  type="text"
                  placeholder="Search icons…"
                  class="mb-1.5 w-full rounded-md border px-3 py-1.5 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                />
                <div class="mb-1.5 flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
                  <button
                    v-for="tab in ICON_TABS"
                    :key="tab.id"
                    type="button"
                    class="flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer"
                    :class="
                      iconTab === tab.id
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    "
                    @click="iconTab = tab.id"
                  >
                    {{ tab.label }}
                  </button>
                </div>
                <div
                  class="grid max-h-40 grid-cols-7 gap-1.5 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 p-2"
                >
                  <button
                    v-if="!iconSearch.trim()"
                    type="button"
                    class="col-span-2 flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    :class="
                      selectedIcon === null
                        ? 'border-gray-800 dark:border-gray-100 text-gray-800 dark:text-gray-100'
                        : 'border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    "
                    title="Auto: detect brand or use the first letter"
                    :disabled="readOnly"
                    @click="selectedIcon = null"
                  >
                    Auto
                  </button>
                  <button
                    v-for="ic in filteredIcons"
                    :key="ic.id"
                    type="button"
                    class="flex aspect-square w-full items-center justify-center rounded-md border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    :class="
                      selectedIcon === ic.id
                        ? 'border-gray-800 ring-1 ring-gray-800 dark:border-gray-100 dark:ring-gray-100'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    "
                    :title="ic.label"
                    :disabled="readOnly"
                    @click="selectedIcon = ic.id"
                  >
                    <IconGlyph :icon="ic" class="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <p
                    v-if="filteredIcons.length === 0"
                    class="col-span-full py-3 text-center text-xs text-gray-400"
                  >
                    No icons match “{{ iconSearch.trim() }}”
                  </p>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                  >Category<span v-if="isShared" class="ml-1 font-normal text-gray-400"
                    >(shared)</span
                  ></label
                >
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    :class="
                      selectedCategoryId === null
                        ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    "
                    :disabled="categoriesLocked"
                    @click="selectedCategoryId = null"
                  >
                    None
                  </button>
                  <CategoryPill
                    v-for="cat in activeCategories"
                    :key="cat.id"
                    :category="cat"
                    :active="selectedCategoryId === cat.id"
                    :use-org="isShared"
                    :can-edit="!categoriesLocked"
                    :disabled="categoriesLocked"
                    @click="selectedCategoryId = cat.id"
                    @removed="
                      selectedCategoryId = selectedCategoryId === cat.id ? null : selectedCategoryId
                    "
                  />
                  <button
                    v-if="!showNewCategory && !categoriesLocked"
                    type="button"
                    class="rounded-full border border-dashed border-gray-300 dark:border-gray-600 px-2.5 py-0.5 text-xs font-medium text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    @click="showNewCategory = true"
                  >
                    + New
                  </button>
                </div>
                <p v-if="isShared && !canEditCategories" class="mt-1 text-xs text-gray-400">
                  You don't have permission to manage categories in a shared vault.
                </p>

                <div v-if="showNewCategory" class="mt-2 flex gap-1.5">
                  <input
                    v-model="newCategoryName"
                    type="text"
                    placeholder="Name"
                    class="min-w-0 flex-1 rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                    @keydown.enter.prevent="handleAddCategory"
                    @keydown.escape="cancelNewCategory"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                    :disabled="!newCategoryName.trim() || isAddingCategory"
                    @click="handleAddCategory"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
                    @click="cancelNewCategory"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div class="flex-1" />

              <div>
                <p v-if="error" class="mb-2 text-xs text-red-600">{{ error }}</p>
                <button
                  type="submit"
                  class="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-800 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  :disabled="isSubmitting || saveBlocked"
                  :title="
                    editBlocked
                      ? 'Only admins can change a shared entry'
                      : saveBlocked
                        ? 'Only admins can add entries to the shared vault'
                        : undefined
                  "
                >
                  <LoadingSpinner v-if="isSubmitting" size="sm" />
                  {{ isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Save entry' }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      @click.self="showDeleteConfirm = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl">
        <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Delete
          {{ entryType === 'password' ? 'password' : entryType === 'card' ? 'card' : 'note' }}?
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">This cannot be undone</p>
        <div
          v-if="linkers.length > 0"
          class="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          <p>
            {{ linkers.length }} {{ linkers.length === 1 ? 'entry signs' : 'entries sign' }} in
            through this one and will lose access to the password if you delete it:
          </p>
          <ul class="mt-1 list-inside list-disc">
            <li v-for="e in linkers" :key="e.id" class="truncate">{{ e.name }}</li>
          </ul>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer transition-colors"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            {{ isDeleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showExposureConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="showExposureConfirm = false"
    >
      <div
        class="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
      >
        <h3 class="text-lg font-semibold text-amber-600 dark:text-amber-400">
          {{
            canRotate
              ? 'This password has been seen by the team'
              : 'This entry has been seen by the team'
          }}
        </h3>
        <div class="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Every member with shared-vault access could have already read, copied or exported this
            secret. Moving it into your private vault takes it off their screen, not out of their
            hands.
          </p>
          <p v-if="sharedLinkers.length > 0" class="text-amber-700 dark:text-amber-300">
            This entry is linked to {{ sharedLinkers.length }} shared
            {{ sharedLinkers.length === 1 ? 'entry signs' : 'entries sign' }} in through this one;
            members will no longer be able to copy the password behind that link.
          </p>
          <p v-if="!canRotate">Change any secret this entry holds to prevent leakage.</p>
          <template v-if="canRotate">
            <p>
              It is recommended to change the password now. After change, don't forget to change it
              at the site/app too.
            </p>
            <div>
              <div class="mb-1 flex items-center">
                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400"
                  >New password</label
                >
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1">·</span>
                <button
                  type="button"
                  class="text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:underline"
                  @click="offerRotation"
                >
                  Generate
                </button>
              </div>
              <div class="relative">
                <input
                  v-model="rotationCandidate"
                  autocomplete="new-password"
                  class="w-full rounded-md border px-3 py-1.5 pr-10 font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                />
                <div class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2.5">
                  <button
                    type="button"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    title="Copy password"
                    aria-label="Copy password"
                    @click="copyRotationCandidate"
                  >
                    <svg
                      v-if="!rotationCopied"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                v-if="rotationCandidate"
                class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
              >
                <span
                  v-if="candidateReusedWith.length > 0"
                  class="relative flex cursor-help items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400"
                  @mouseenter="showCandidateReusedTooltip = true"
                  @mouseleave="showCandidateReusedTooltip = false"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  Reused by {{ candidateReusedWith.length }} other
                  {{ candidateReusedWith.length === 1 ? 'entry' : 'entries' }}

                  <span
                    v-if="showCandidateReusedTooltip"
                    class="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg"
                  >
                    <span class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Also used by</span
                    >
                    <span class="block space-y-0.5">
                      <span
                        v-for="e in candidateReusedWith"
                        :key="e.id"
                        class="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300"
                      >
                        <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"></span>
                        <span class="truncate">{{ e.name }}</span>
                      </span>
                    </span>
                  </span>
                </span>
                <span v-if="candidateBreachStatus === 'checking'" class="text-gray-400"
                  >Checking breaches…</span
                >
                <span
                  v-else-if="candidateBreachStatus === 'breached'"
                  class="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  Found in data breach
                </span>
                <span
                  v-else-if="candidateBreachStatus === 'clean'"
                  class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  No known breaches
                </span>
              </div>
            </div>
          </template>
        </div>
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
            :disabled="isSubmitting"
            @click="showExposureConfirm = false"
          >
            Cancel
          </button>
          <button
            ref="rotateButton"
            type="button"
            class="rounded-lg bg-gray-900 dark:bg-gray-100 px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isSubmitting || (canRotate && !rotationCandidate)"
            @click="
              entryType === 'password' ? rotateAndMakePrivate() : makePrivateWithoutRotating()
            "
          >
            {{ exposureConfirmLabel }}
          </button>
        </div>
        <div v-if="canRotate" class="mt-3 flex justify-end">
          <button
            type="button"
            class="text-xs text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors disabled:opacity-50"
            :disabled="isSubmitting"
            @click="makePrivateWithoutRotating"
          >
            Keep the exposed password instead
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showPrivateLinkConfirm && linkedEntry"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      @click.self="showPrivateLinkConfirm = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl">
        <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Login entry stays private
        </h2>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {{ account.name || 'This entry' }} signs in through {{ linkedEntry.name }}, which is in
          your private vault. Other members will see the link but cannot copy its password. Share
          {{ linkedEntry.name }} too if they need it.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
            @click="showPrivateLinkConfirm = false"
          >
            Cancel
          </button>
          <button
            ref="privateLinkButton"
            type="button"
            class="rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white disabled:opacity-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            :disabled="isSubmitting"
            @click="handleSubmit({ exposure: true, privateLink: true })"
          >
            Share anyway
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showLeaveConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      @click.self="keepEditing"
    >
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl">
        <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Discard {{ isEditMode ? 'changes' : 'this entry' }}?
        </h2>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Your unsaved changes will be lost
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
            @click="keepEditing"
          >
            Keep editing
          </button>
          <button
            ref="discardButton"
            type="button"
            class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            @click="discardAndLeave"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
