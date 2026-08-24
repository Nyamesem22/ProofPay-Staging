# Operations, incident response and disaster recovery

## Monitoring

- Uptime probe: `GET /api/health` every minute.
- Dependency probe: `GET /api/readiness` every minute from a private monitor.
- Alert on 5xx rate, p95 latency, failed login spikes, rate-limit fallback mode, database saturation, provider-command backlog and unresolved reconciliation items.
- Every incident should reference the `X-Request-Id` returned by the API.

## Release-delay response

1. Check transaction state and immutable events; do not infer success from a browser screen.
2. Confirm the payment command’s idempotency key and provider reference.
3. Query provider status using that reference. Never create an unrelated second release command.
4. If the provider succeeded, reconcile and record the signed confirmation.
5. If status is unknown, keep the transaction in `RELEASE_PENDING`, notify operations and the parties, and retry safely.
6. Manual intervention must require two authorized staff members before live activation.

## Security incident

1. Contain: revoke affected sessions, disable provider keys and set `PAYMENTS_ENABLED=false` when money movement may be affected.
2. Preserve: export relevant audit, transaction-event and provider logs without altering originals.
3. Investigate by request ID, actor and entity. Do not put secrets or full identity documents in tickets.
4. Notify legal, compliance, the licensed partner and affected users according to the approved incident plan.
5. Recover with rotated credentials and a reviewed deployment; document root cause and corrective actions.

## Backup and recovery

- Enable Neon point-in-time recovery and choose retention that meets legal and business requirements.
- Take a logical encrypted export before material schema changes and test restoration quarterly to an isolated Neon project.
- Treat evidence storage separately: configure Vercel Blob retention and export requirements according to the approved records policy.
- Keep source in GitHub and deployment history in Vercel; require branch protection on `main`.
- Recovery targets for the MVP should be agreed before launch. A practical initial target is RTO 4 hours and RPO 15 minutes, subject to the selected provider plans.

## Daily staff report

Operations staff record completed work, transaction/reconciliation metrics, incidents and handover notes through the protected `/api/admin/reports` route. Reports are retained in PostgreSQL and access is role-controlled.
