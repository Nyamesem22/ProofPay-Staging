# Vercel and Neon deployment

## One-time setup

1. Push this repository to GitHub and import it into Vercel.
2. Create a Neon PostgreSQL project in the deployment region nearest the primary users.
3. Set `DATABASE_URL` in Vercel for Preview and Production. Use a different database or branch for each environment.
4. Run `npm run db:migrate` against each environment once.
5. Set `APP_ORIGIN` to the exact HTTPS production origin and keep `COOKIE_SECURE=true`.
6. Connect Upstash Redis, Vercel Blob and Sentry, then add their credentials.
7. Leave `PAYMENTS_ENABLED=false` until the licensed payment integration passes acceptance and reconciliation testing.

Vercel runs `npm run build:vercel` and serves `dist/client`. Root files under `api/` become Functions. SPA routes are rewritten to `index.html`; `/api` is not rewritten.

## Required variables

- `DATABASE_URL`
- `APP_ORIGIN`
- `SESSION_COOKIE_NAME`
- `COOKIE_SECURE`

## Strongly recommended production variables

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- `BLOB_READ_WRITE_TOKEN`
- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE`

Provider placeholders are documented in `.env.example`. Add them only to Vercel’s encrypted environment-variable store.

## Release gates

- GitHub CI must pass lint, unit, packaging and dependency audit jobs.
- Vercel Preview must return 200 from `/api/health` and `ready: true` from `/api/readiness`.
- Apply schema changes before application code that needs them.
- Test sign-up, login, logout, transaction creation, dispute freeze and role denial.
- Promote the exact tested commit to Production.

## Rollback

Use Vercel’s previous deployment rollback for application failures. Database migrations are forward-only: prepare a corrective migration, test it on a Neon branch, back up, and then apply it. Never destructively reset production data.
