# Security design

## Controls implemented

- Passwords use Node.js scrypt with a unique random salt. Plaintext passwords are never stored or logged.
- Sessions use 256-bit opaque tokens in `HttpOnly`, `SameSite=Strict`, production `Secure` cookies. Only token hashes are stored.
- PostgreSQL queries are parameterized through the Neon driver.
- Zod validates and bounds all external input.
- Mutating browser requests receive origin validation; API responses deny framing and MIME sniffing.
- Vercel headers include a restrictive content security policy, HSTS, Referrer Policy and Permissions Policy.
- Admin API routes require explicit server-side roles. UI visibility is never treated as authorization.
- Authentication, dispute, upload and release endpoints have stricter rate limits.
- Signed webhook verification uses HMAC and constant-time comparison. Unique provider event IDs provide replay resistance.
- Evidence uploads permit only JPEG, PNG, WebP and PDF with a 10 MiB limit and authorization tied to the transaction.
- Audit logs contain action, actor, entity, result, request ID and a hash of the source IP. Sensitive fields are redacted from structured logs.
- Live payments fail closed while provider configuration is absent.

## Before processing real money

1. Complete legal and regulatory review with Ghanaian counsel and the contracted licensed PSP/bank.
2. Replace pitch-mode identity claims with NIA IVSP or an authorized verification partner, including consent and biometric policy.
3. Perform penetration testing, threat-model review and provider webhook replay testing.
4. Add four-eyes approval for manual release/refund, transaction thresholds, sanctions/AML monitoring and case-management controls.
5. Keep customer funds outside ProofPay’s operating account under the licensed partner’s approved safeguarding arrangement.
6. Rotate production credentials, enforce MFA/SSO for staff, and remove pitch-only admin access.
7. Commission independent reconciliation and incident-response exercises.

## Reporting a vulnerability

Do not open a public GitHub issue. Send a private report to the security contact configured by the repository owner. Include the affected route, reproduction steps and impact. Do not access other users’ data or move funds during testing.
