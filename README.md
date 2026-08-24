# ProofPay

ProofPay is an inclusive protected-payment platform prototype for web and USSD. It records the parties, agreement, evidence and release rule around an existing mobile-money or bank payment. The product is a protection layer, not a deposit-taking wallet.

## What is implemented

- Responsive public website, customer portal, full payment-creation flow and realistic `*719#` feature-phone simulation.
- Departmental operations dashboard at `/admin` for the pitch environment.
- Vercel Functions API for registration, login, sessions, protected demo transactions, disputes, evidence uploads, staff reports and provider webhooks.
- Neon PostgreSQL schema with users, wallets, sessions, transactions, immutable events, disputes, payment commands, webhook receipts, audit logs and staff reports.
- HttpOnly session cookies, scrypt password hashing, role checks, origin checks, request validation, safe error responses and audit records.
- Distributed rate limiting and short-lived operational caching with Upstash REST when configured, plus bounded in-memory development fallbacks.
- Private evidence upload support through Vercel Blob.
- Structured Vercel logs and optional Sentry error tracking.
- Vercel deployment configuration, CI, dependency updates, CodeQL and operational runbooks.

## Local start

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The web demo works without external secrets. Users created in this mode are stored only in that browser. They are clearly marked as demo users and no real money is moved.

## Enable persistent Neon accounts

1. Create a Neon project and copy its pooled connection string to `DATABASE_URL`.
2. Run `npm run db:migrate`.
3. Start or deploy the application.
4. Optionally create the first operations administrator:

```bash
ADMIN_FULL_NAME="Operations Lead" \
ADMIN_PHONE="+233555000000" \
ADMIN_PASSWORD="replace-with-a-strong-password" \
npm run db:create-admin
```

Never commit `.env`, provider secrets, database URLs or signing keys.

## Verification

```bash
npm run check
```

This runs ESLint, unit tests, both production packaging paths and a high-severity dependency audit.

## Deploy to Vercel

Import the GitHub repository into Vercel, add the environment variables described in [Deployment](docs/DEPLOYMENT.md), run the Neon migration once, then deploy. Vercel builds the Vite frontend and deploys files under `api/` as Functions.

## Important financial boundary

`PAYMENTS_ENABLED` defaults to `false`. The repository contains safe integration interfaces and a signed webhook receiver, but no live collection, safeguarded holding, release or refund is claimed. Activate live payments only after a Bank of Ghana-compliant licensed-provider contract, legal review, reconciliation testing and signed webhook integration.

See [Architecture](docs/ARCHITECTURE.md), [Security](docs/SECURITY.md), [Deployment](docs/DEPLOYMENT.md) and the [Operations runbook](docs/OPERATIONS-RUNBOOK.md).
