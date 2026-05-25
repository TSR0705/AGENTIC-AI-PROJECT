# Security Policy & Implementation

This document details the security model, configuration policies, validation schemes, and hardening standards implemented in CodeWeave.

---

## 🛡️ Security Architecture Overview

The system secures API routes, real-time socket sessions, database entries, and environment boundaries using standard defense-in-depth principles:

```
[ Client Requests ]
        │
        ▼
┌──────────────────────────────────────────────┐
│ 1. HTTP Security Headers (Helmet)            │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 2. API Rate Limiting (express-rate-limit)    │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 3. CORS Domain Restriction & Origin Controls │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 4. JWT Authorization Token Checks            │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 5. Project Membership Authorization Guards  │
└──────────────────────────────────────────────┘
        │
        ▼
[ Secured Route Handler ]
```

---

## 🔒 Implemented Hardening Standards

### 1. HTTP Security Headers (Helmet)

Express routes are wrapped with `helmet()` middleware to automatically inject standards-compliant security headers:

- **Content-Security-Policy (CSP)**: Restricts scripts, styles, and asset loads.
- **X-Frame-Options**: Prevents clickjacking attacks (sets header to `SAMEORIGIN`).
- **Strict-Transport-Security (HSTS)**: Forces SSL/TLS transport.
- **X-Content-Type-Options**: Enforces MIME-type matching (sets `nosniff`).

### 2. API Rate Limiting (`express-rate-limit`)

We block distributed denial of service (DDoS) and brute force login attempts using IP rate limits:

- **General APIs**: Maximum 100 requests per 15-minute window.
- **Auth Endpoint (/users/login, /users/register)**: Limited to 15 requests per 15-minute window.

### 3. Strict CORS Validation

We replace CORS wildcards (`*`) with environment-configured allow-lists:

- In production, only the domains listed in `env.CORS_ORIGIN` are allowed to perform REST transactions and open websocket handshakes.

### 4. Input & Schema Validation

All request parameters and payloads are validated prior to controller entry:

- **REST Endpoints**: Validated using `express-validator` schema validations.
- **Environment Boundaries**: Checked on startup using a **Zod** schema parser inside `config/env.js`, ensuring the process exits immediately with clear logs if variables are malformed.

### 5. Least Privilege Project Membership

We enforce user-to-project ownership checks:

- Project details retrieval and file tree modification routes verify that the logged-in user is explicitly recorded inside the project's `users` collection.
- Real-time Socket.io connections are authenticated via JWT, and handshakes are rejected if the user is not an active project collaborator.

---

## 📦 Container Hardening

When running inside Docker:

- **Non-Root Execution**: The node process runs under the unprivileged `node` user account rather than root.
- **Minimal Base Image**: Built using `node:22-alpine` to reduce the image attack surface.
- **Read-Only Volume mounts**: Used where appropriate to prevent running containers from writing to local source code folders.
