# Contributing to CodeWeave

We welcome contributions from the community! Follow these instructions to set up your environment, write clean code, and submit Pull Requests.

---

## 🛠️ Local Development Setup

Please refer to the [Developer Guide](docs/development.md) for full instructions on local installation and environment variables.

---

## 📏 Development Rules

1. **Keep it Dry & Solid**: Follow clean code principles (SOLID, DRY).
2. **Strict Formatting**: Run linters and formatters before committing changes:
    ```bash
    npm run format
    npm run lint
    ```
3. **Write Automated Tests**: Add test suites inside `/tests` or `backend/tests` covering any new functions, routes, or components. Verify tests pass:
    ```bash
    npm run test --prefix backend
    ```
4. **Conventional Commit Formats**: All commit messages must follow the Conventional Commits specifications (verified by local git hooks).
    - _Example_: `feat(editor): implement syntax color theme selector`
    - _Example_: `fix(socket): prevent crash on null project lookup`

---

## 🚀 Pull Request Lifecycle

1. **Create a Branch**: Create a feature branch originating from the `main` branch.
    ```bash
    git checkout -b feat/your-awesome-feature
    ```
2. **Submit PR**: Open a Pull Request targeting `main`.
3. **CI Pipeline Validation**: GitHub Actions will automatically run format checks, linters, tests, and build checks. PRs will not be merged if any check fails.
4. **Code Review**: At least one maintainer must review and approve your PR before merging.
