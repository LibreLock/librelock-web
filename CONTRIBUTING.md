# Contributing

## Setting the environment

Requirements: Node.js 22+

```bash
git clone <repo-url>
cd librelock-web

npm install
npm run dev
```

The dev server runs on [localhost:1401](http://localhost:1401) (`WEB_PORT`) and proxies `/api` to `http://localhost:8000` (`API_UPSTREAM`), so the frontend and the API share one origin in development just as they do in production. `VITE_API_BASE_URL` overrides the base URL at build time and is only for deployments that serve the API from another origin.

## Running tests

```bash
# Unit tests
npm run test:unit

# End-to-end tests (build first)
npm run build
npx playwright install
npm run test:e2e
```

## Releases

Pushing a `v*` tag runs `.github/workflows/publish.yml`, which builds `linux/amd64` + `linux/arm64` and pushes `ghcr.io/librelock/librelock-web` as `1.2.3`, `1.2`, `1`; pushes to `main` publish `latest` and `main-<sha>`.

The version is never written down in the repository - `package.json` stays at `0.0.0` and any build without `APP_VERSION` reports `dev`. The git tag is the only source of truth, and the same tag goes on [librelock-server](https://github.com/LibreLock/librelock-server), so LibreLock has one version number. Tag both with [`release.sh`](https://github.com/LibreLock/.github/blob/main/release.sh):

```bash
./release.sh 0.1.0
```

## Code style

- Run `npm run lint` and `npm run format` before committing
- Keep presentation in `views`/`components` and logic in `stores`/`services`/`composables`
- Comment only non-obvious constraints or security invariants

## Security considerations

Before making changes, understand the cryptographic model described in this [README](https://github.com/LibreLock/). Key rules:

- **Vault data must never leave the browser unencrypted**
  <br>
  Encrypt with `services/crypto.ts` (AES-256-GCM, random IV per item) before calling the API
- **The master password and derived `MasterKey` must never be sent to the server or persisted**
  <br>
  Only `auth_credential` (an HKDF output) and the wrapped `protected_key` leave the client
- **The vault key lives only in memory (`services/keyring.ts`) and IndexedDB (`services/keystore.ts`)**
  <br>
  Never write it to `localStorage` or persisted Pinia state
- **Avoid `v-html`, `innerHTML`, and `eval`**
  <br>
  Vault contents are user-controlled and rendered without sanitization elsewhere - keep it that way by sticking to text bindings

## Submitting a pull request

1. Fork the repository and create a branch off `main`
2. Make your changes; ensure `npm run lint`, `npm run type-check`, and `npm run build` pass
3. Open a PR with a clear description of the changes
