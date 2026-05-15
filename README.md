<div align="center">
  <img src="public/logo.svg" alt="LibreLock logo" height="70" />
  <h1 align="center">LibreLock Web</h1>
</div>

Web application for LibreLock, a secure self-hosted password manager. Built with [Vue](https://vuejs.org/) and [Vite](https://vitejs.dev/).

## Get started

To use LibreLock, refer to _Get started_ section in this [README](https://github.com/LibreLock/).

## Development

The preferable way to run the API is via Docker:

```bash
docker compose up -d
```

If you wish to run frontend locally without Docker, you can use the following commands:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Lint the codebase
npm run lint

# Build for production
npm run build

# Preview production build locally
npm run preview
```

To run Unit Tests with [Vitest](https://vitest.dev/):

```bash
npm run test:unit
```

To run End-to-End Tests with [Playwright](https://playwright.dev):

```bash
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```
