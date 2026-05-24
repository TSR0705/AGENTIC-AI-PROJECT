# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Conventional Commits](https://www.conventionalcommits.org/).

---

## [1.0.0] - 2026-05-24

### Added

- Created a production-grade multi-stage backend `Dockerfile` running as a non-root `node` user.
- Configured a workspace-wide `docker-compose.yml` for unified execution.
- Added comprehensive Vitest suite in backend, integrating in-memory MongoDB Server.
- Configured ESLint, Prettier, EditorConfig, Husky hooks, Lint-Staged, and Commitlint at root workspace.
- Added structured GitHub Actions workflows for PR validation, release tagging, and security audits.
- Implemented deep-dive guides inside `/docs` for API specs, deployments, troubleshooting, and architecture.

### Changed

- Refactored project screen frontend to a flat, high-contrast, multi-tabbed developer IDE workspace.
- Consolidated separate Files and Collaborators panels into a single sidebar.
- Added real-time local file search indexing in the sidebar.

### Fixed

- Fixed critical uncaught process crash in Socket.io middleware when project is not found.
- Secured project details retrieval and file tree modification routes by enforcing membership verification.
- Protected `/ai/get-result` route with authentication middleware.
- Made token splitting inside auth middleware safe from undefined authorization header crashes.
