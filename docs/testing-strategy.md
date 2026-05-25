# Testing Strategy

This document details the testing architecture, validation targets, local verification commands, and CI execution flow for CodeWeave.

---

## 📐 The Test Pyramid

We enforce a comprehensive, automated testing strategy that spans across multiple layers:

```
          / \
         /   \      Smoke Tests (API Health & Socket Connectivity)
        /     \
       /-------\
      /         \   Integration Tests (Controller + Service DB flows)
     /           \
    /-------------\
   /               \  Unit Tests (Schema validations, JWT helpers, auth guards)
  /_________________\
```

### 1. Unit Tests

- **Target**: Pure helper functions, database validations, model statics, and middleware logic.
- **Backend Components**: `userSchema` static functions, `auth.middleware.js`, token validation utilities.
- **Frontend Components**: Utility text parsers, state hook initializations, date formatter helpers.

### 2. Integration Tests

- **Target**: Complete REST API flows (Route -> Controller -> Service -> database interaction).
- **Tooling**: `supertest` for HTTP mocking combined with `mongodb-memory-server` to run a virtual MongoDB instance.
- **Focus Areas**: User registration, authenticated project creation, adding collaborators, and membership route protection.

### 3. Smoke & Connectivity Tests

- **Target**: Handshake, authentication checks, room joining, and messaging flows inside `Socket.io`.
- **Tooling**: `socket.io-client` in virtual node script runs.

---

## 🛠️ Testing Tools

- **Backend / Frontend Runner**: **Vitest**
    - Extremely fast execution with ESM native support.
    - HMR (Hot Module Replacement) support for local development.
- **API Request Mocking**: **Supertest**
    - Declares requests against the Express app instance.
- **In-Memory Database**: **MongoDB Memory Server (`mongodb-memory-server`)**
    - Isolates tests completely from local or cloud MongoDB instances.
    - Spins up and tears down automatically per test file.

---

## 💻 Local Testing Commands

### Backend Tests

To run all backend tests once:

```bash
npm run test --prefix backend
```

To run backend tests in watch mode:

```bash
npx vitest --prefix backend
```

### Frontend Tests

To run all frontend tests once:

```bash
npm run test --prefix frontend
```

---

## 🚀 CI Pipeline Integration

Tests are executed automatically on every Pull Request and Branch Push to the main branch via the GitHub Actions runner (`ci.yml`).

- **Step 1**: Node.js environment setup with cache configurations.
- **Step 2**: Installation of dependencies in parallel.
- **Step 3**: Database-less execution of backend routes utilizing the virtual Memory Server.
- **Step 4**: Vitest verification report publishing.
