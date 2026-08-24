# ProofPay architecture

## Request path

```text
Web / feature-phone simulation
            |
       Vercel CDN
            |
  Vite SPA + /api Functions
       |       |       |
     Neon   Upstash  Vercel Blob
  PostgreSQL rate/cache evidence
            |
 Licensed payment and identity partners (disabled until configured)
```

The browser never receives database, storage or provider secrets. Server functions validate every request and make the final authorization decision. The `/admin` interface currently contains pitch data; protected operational API endpoints independently require `staff`, `admin` or `auditor` roles.

## Components

| Layer | Implementation | Scaling model |
|---|---|---|
| Frontend | React 19, Vite and Motion | Immutable assets cached at Vercel edge locations |
| API | Node.js Vercel Functions | Stateless horizontal scaling and per-function resource limits |
| Database | Neon PostgreSQL through the serverless HTTP driver | Pooled connections, Neon compute scaling and point-in-time recovery per selected Neon plan |
| Authentication | Opaque random session token; only a SHA-256 token hash is stored | Stateless lookup through Neon; revocable sessions |
| Rate limiting/cache | Upstash Redis REST | Shared across function instances; memory fallback is development-only |
| Evidence | Private Vercel Blob uploads | Direct client upload using short-lived server-authorized tokens |
| Observability | JSON logs, request IDs and optional Sentry | Centralized by Vercel/Sentry |

## Transaction state model

```text
DRAFT -> AWAITING_PAYMENT -> PROTECTED -> DELIVERED -> READY_TO_RELEASE
                                      |                    |
                                      +-> DISPUTED         +-> RELEASE_PENDING -> RELEASED
                                              |
                                              +-> REFUND_PENDING -> REFUNDED
```

Database constraints restrict states. Transaction updates increment `version`, and material actions create `transaction_events` and `audit_logs`. A provider webhook ID is unique, preventing duplicate receipt processing. Live collection and release commands must use unique idempotency keys before partner activation.

## Availability and performance

- Static files use long-lived immutable edge caching.
- Functions are stateless and can be distributed by Vercel.
- Upstash supplies cross-instance rate limiting and small operational caches.
- Neon’s HTTP driver avoids long-lived TCP connections from serverless functions.
- Health and readiness endpoints distinguish a live process from a database-ready deployment.
- Provider calls should be asynchronous and retried through `payment_commands`; user-visible status remains pending until a signed provider confirmation is recorded.

No architecture can honestly guarantee zero errors or zero downtime. The controls in this repository reduce failure probability and make failures visible, recoverable and auditable.
