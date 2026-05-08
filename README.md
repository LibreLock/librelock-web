<div align="center">
  <img src="public/favicon.ico" alt="Password manager logo" height="70" />
  <h1 align="center">Password manager</h1>
</div>

Self-hosted web-based password manager. Built out of distrust in third-party password managers. Built with Vue and Laravel.

## Features

- **Secure by design**: All data is encrypted on the client side before being sent to the server. The server only stores encrypted data and never has access to the encryption keys.
- **Zero-knowledge architecture**: The server cannot read or access any of the user's data, ensuring maximum privacy and security.
- **User-friendly interface**: A clean and intuitive UI for managing passwords, with features like search, categorization, and password generation.

## Get started

1. Clone frontend and backend repositories:

```bash
git clone https://github.com/lebaaar/password_manager.git
git clone https://github.com/lebaaar/password_manager.git
```

2.Build and run the backend:

```bash
cd password_manager_backend
docker build -t password-manager-backend .
docker run -d -p 3000:3000 --name password-manager-backend password-manager-backend
```

3. Build and run the frontend:

```bash
cd password_manager_frontend
docker build -t password-manager-frontend .
docker run -d -p 5173:5173 --name password-manager-frontend password-manager-frontend
```

4. Open [localhost:5173](http://localhost:5173) to access the password manager.

## Development

Bellow find instructions for developing frontend

**Install dependencies**

```bash
npm install
```

**Compile and Hot-Reload for Development:**

```bash
npm run dev
```

**Type-Check, Compile and Minify for Production:**

```bash
npm run build
```

**Run Unit Tests with [Vitest](https://vitest.dev/):**

```bash
npm run test:unit
```

**Run End-to-End Tests with [Playwright](https://playwright.dev):**

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

### Lint with [ESLint](https://eslint.org/)

```bash
npm run lint
```
