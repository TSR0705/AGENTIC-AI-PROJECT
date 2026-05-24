# Observability Guide

This document details the telemetry, logging standards, health check probes, and request tracking mechanisms implemented to ensure production reliability in the Whisper Sandbox.

---

## 🪵 Structured Logging

We replace raw `console.log` statements with **Winston**, a production-grade logging framework:

- **Production Format**: Output logs in JSON to support parsing by aggregation tools (Datadog, ElasticSearch, Logstash, AWS CloudWatch).
- **Log Levels**:
    - `error`: Log uncaught runtime exceptions and failed connection states.
    - `warn`: Log system degradations (e.g. falling back to in-memory db from Redis).
    - `info`: Log normal operation details (server startup, database connections, user events).
    - `debug`: Detailed diagnostics (socket messages, transaction states).

---

## 🔗 Request Correlation IDs

To trace the complete lifecycle of an API call across microservices or logs, every incoming request is assigned a unique Correlation ID:

- Middleware checks for an existing `X-Correlation-ID` header.
- If missing, a unique `uuid` is generated and assigned.
- The Correlation ID is automatically appended to all logs generated during that request and returned in the HTTP response headers for debugging.

---

## 🚦 Health Probes (/health)

We expose health check HTTP endpoints to allow hosting platforms (like Kubernetes, Render, Railway, AWS ECS) to monitor the application container's status:

### 1. Liveness Probe (`/health/live`)

- **Purpose**: Verify if the server process is responsive and not locked in a dead loop.
- **Action**: Responds with `200 OK` instantly if the server is running.

### 2. Readiness Probe (`/health/ready`)

- **Purpose**: Verify if the server is ready to accept user traffic (all downstream dependencies are connected).
- **Checks**:
    - MongoDB connection state is `1` (Connected).
    - Redis Client connection state is open (or using memory database fallback safely).
- **Action**: Responds with `200 OK` if all checks pass, otherwise `503 Service Unavailable`.
