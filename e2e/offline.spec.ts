import { test, expect } from '@playwright/test'

// A LibreLock instance published only over a VPN is unreachable whenever the tunnel is down, which
// at the network layer looks like the requests below: no status, no body, nothing to report.
const apiRoute = (url: URL) => url.pathname.startsWith('/api/')

test('shows the unreachable screen instead of a blank page when the API cannot be reached', async ({
  page,
}) => {
  await page.route(apiRoute, (route) => route.abort('connectionrefused'))
  await page.goto('/')

  await expect(page.getByRole('heading')).toHaveText(/Cannot reach LibreLock/i)
  await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible()
})

test('recovers from the unreachable screen once the server answers again', async ({ page }) => {
  let down = true
  await page.route(apiRoute, (route) => {
    if (down) return route.abort('connectionrefused')
    if (route.request().url().includes('/auth/me')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ user: null }) })
    }
    return route.fulfill({ status: 200, body: '{}' })
  })

  await page.goto('/')
  await expect(page.getByRole('heading')).toHaveText(/Cannot reach LibreLock/i)

  down = false
  await page.getByRole('button', { name: /Try again/i }).click()

  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible({ timeout: 15000 })
})

test('warns with a banner when the server drops after the app is already up', async ({ page }) => {
  let down = false
  await page.route(apiRoute, (route) => {
    if (down) return route.abort('connectionrefused')
    if (route.request().url().includes('/auth/me')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ user: null }) })
    }
    return route.fulfill({ status: 200, body: '{}' })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()

  down = true
  await page.locator('input[autocomplete="username"]').fill('someone')
  await page.locator('input[autocomplete="current-password"]').fill('password12345')
  await page.locator('form button').last().click()

  await expect(page.getByRole('status').getByText(/Cannot reach LibreLock/i)).toBeVisible({
    timeout: 20000,
  })
})
