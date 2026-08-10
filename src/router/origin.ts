import type { RouteLocationNormalizedLoaded, RouteLocationRaw, Router } from 'vue-router'
import type { VaultEntry } from '@/api/vault'

/**
 * Where the user was before opening the entry form.
 *
 * The form has no tab of its own and lives under /vault/*, so without this it always read as
 * "All Items": the nav highlight jumped there on the way in, and saving dropped the user in the
 * vault list on the way out, whichever page they started from. The origin is nav state, not
 * addressable content, so it stays out of the URL — vue-router already records the previous
 * entry's path in `history.state.back`, which survives reloads and back/forward.
 */
export const LIST_SECTIONS = ['vault', 'passwords', 'cards', 'notes', 'shared'] as const
export type ListSection = (typeof LIST_SECTIONS)[number]

const FORM_ROUTES = ['vault-new', 'vault-edit']

/** The entry type a single-type list holds; 'vault' and 'shared' mix all three. */
export const SECTION_TYPE: Partial<Record<ListSection, VaultEntry['type']>> = {
  passwords: 'password',
  cards: 'card',
  notes: 'note',
}

function isSection(value: unknown): value is ListSection {
  return typeof value === 'string' && (LIST_SECTIONS as readonly string[]).includes(value)
}

function isFormRoute(name: unknown): boolean {
  return typeof name === 'string' && FORM_ROUTES.includes(name)
}

/** Path of the previous history entry, or null on a direct visit or a fresh tab. */
export function originPath(): string | null {
  const back = window.history.state?.back
  return typeof back === 'string' ? back : null
}

/** The path the nav should treat as current: the form borrows the page it was opened from, so
 *  the highlight stays put instead of jumping to All Items. */
export function navPath(route: RouteLocationNormalizedLoaded): string {
  return isFormRoute(route.name) ? (originPath() ?? route.path) : route.path
}

/** The entry list the form was opened from, or null when it came from a page that holds no
 *  entries (Security Center, Settings, Organization). */
export function originSection(router: Router): ListSection | null {
  const path = originPath()
  if (!path) return null
  const name = router.resolve(path).name
  if (typeof name !== 'string') return null
  const base = name.replace(/-entry$/, '')
  return isSection(base) ? base : null
}

/** Whether a list still holds this entry — its type or scope may have changed while editing. */
function listShows(section: ListSection, entry: VaultEntry): boolean {
  if (section === 'vault') return true
  if (section === 'shared') return entry.shared
  return !entry.shared && entry.type === SECTION_TYPE[section]
}

/**
 * Where to go after saving: back where the user came from. An entry list gets the saved entry
 * selected; any other page is returned to as-is. The fallback covers a list that no longer holds
 * the entry (its type or scope changed) and a form opened directly by URL.
 */
export function returnRouteFor(
  section: ListSection | null,
  path: string | null,
  entry: VaultEntry,
): RouteLocationRaw {
  if (section) {
    const target = listShows(section, entry) ? section : entry.shared ? 'shared' : 'vault'
    return { name: `${target}-entry`, params: { id: entry.id } }
  }
  if (path) return path
  return { name: entry.shared ? 'shared-entry' : 'vault-entry', params: { id: entry.id } }
}

/** Same, for a deleted entry: there is nothing left to select, so lists drop to their root. */
export function deleteReturnRouteFor(
  section: ListSection | null,
  path: string | null,
  wasShared: boolean,
): RouteLocationRaw {
  if (section) return { name: section }
  if (path) return path
  return { name: wasShared ? 'shared' : 'vault' }
}
