# System Architecture & Diagrams

This document details the system design, communication protocols, request lifecycles, and security boundaries of the collaborative sandbox environment.

---

## 🏗️ High-Level System Architecture

The sandbox uses a decoupled, event-driven architecture to facilitate real-time code collaboration and AI generation.

```mermaid
graph TD
    subgraph Client Layer
        A[Vite React SPA]
    end

    subgraph API Gateway / Network
        B[REST Endpoint]
        C[Socket.io Namespace]
    end

    subgraph Server Services
        D[Express Router]
        E[Socket Gateway]
        F[AI Service - Gemini API]
    end

    subgraph Storage Layer
        G[(MongoDB Database)]
        H[(Redis Memory Cache)]
    end

    A -->|HTTP API Requests| B
    A -->|WebSocket Connections| C
    B --> D
    C --> E
    D --> G
    E --> G
    E --> F
    D -->|Token Blacklist Checks| H
    E -->|Token Verification| H
```

---

## 🚦 Request & Data Lifecycles

### 1. HTTP REST Authentication Lifecycle

Below is the sequence of auth verification and header mapping when accessing secured API routes:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client App
    participant Middleware as Auth Middleware
    participant Controller as Express Controller
    participant Mongoose as User Model (DB)

    Client->>Middleware: GET /users/profile [with Token]
    Note over Middleware: Checks cookie or Bearer header
    alt Token Missing
        Middleware-->>Client: 401 Unauthorized
    else Token Present
        Middleware->>Middleware: Verify JWT & extract email / _id
        alt Signature Invalid
            Middleware-->>Client: 401 Unauthorized
        else Signature Valid
            Middleware->>Controller: Forward req (user set)
            Controller->>Mongoose: Find user by _id
            Mongoose-->>Controller: Return user payload (excluding password)
            Controller-->>Client: 200 OK (User Data)
        end
    end
```

### 2. Sockets Real-Time Synchronization Flow

Real-time message routing and AI prompt triggers flow dynamically through project rooms:

```mermaid
sequenceDiagram
    autonumber
    actor ClientA as Developer A
    actor ClientB as Developer B
    participant Gateway as Socket server.js
    participant AI as AI Service (Gemini)
    participant DB as MongoDB

    ClientA->>Gateway: emit("project-message") [msg: "@ai Create index.js"]
    Note over Gateway: Persist message to DB
    Gateway->>DB: findByIdAndUpdate(Project, messages)
    Gateway->>ClientB: broadcast.to(roomId, msg)
    Note over Gateway: Detects "@ai" keyword
    Gateway->>AI: generateResult("Create index.js")
    AI-->>Gateway: Return Code JSON
    Gateway->>DB: Push AI Response
    Gateway->>ClientA: emit("project-message", response)
    Gateway->>ClientB: emit("project-message", response)
```

---

## 🛡️ Security Boundaries

We isolate operational layers to block arbitrary access:

```mermaid
graph LR
    subgraph Public Internet
        A[Client Browser]
    end

    subgraph Secure Perimeter (Perimeter Firewall)
        B[Express App Router]
        C[Socket Server]
    end

    subgraph Internal Network (No External Access)
        D[(MongoDB Cluster)]
        E[(Redis Instance)]
        F[Google Gemini API Gateway]
    end

    A -->|REST API over SSL| B
    A -->|WSS Sockets| C
    B -->|Mongoose connection| D
    C -->|Mongoose connection| D
    B -->|Caching| E
    C -->|AI Queries| F
```

---

## 💻 Developer Workflow

The lifecycle of developer updates from local editor to production repository:

```mermaid
graph TD
    A[Write Code Locally] --> B[Commit Code]
    B -->|Trigger Husky commit-msg hook| C{Verify Conventional Commit}
    C -->|Invalid| D[Reject Commit]
    C -->|Valid| E[Create Git Commit]
    E -->|Trigger pre-commit hook| F[Run Lint-Staged]
    F -->|Lint / Format Fails| G[Reject & Format Code]
    F -->|Passes| H[Push to GitHub]
    H -->|Trigger GitHub Action ci.yml| I[Run Parallel Matrices & Tests]
    I -->|Fails| J[Block Pull Request]
    I -->|Passes| K[Merge & Deploy Container]
```
