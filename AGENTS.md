# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

For payment-channel coverage on the public landing page, use authentic provider brand assets rather than text-only placeholders. The current pitch vision includes Ghana (MTN MoMo, Telecel Cash, AT Money), Togo (Mixx by Yas, Moov Africa/Flooz), Nigeria (MoMo PSB, Smartcash PSB), plus bank-account and Visa-card categories. Use the full MoMo wordmark treatment for Ghana and an official Visa mark for cards. Keep a visible disclaimer that network availability depends on licensed partners and commercial agreements.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

The staff operations prototype is available at `/admin`. Treat it as a separate, role-based company workspace rather than an extension of the customer dashboard. Its durable information architecture includes payment operations, release control, transaction and account tracking, KYC/KYB verification, disputes, fraud and risk, safeguarded-funds reconciliation, partner health, immutable audit records, departments, staff task dashboards, and daily operations reporting.

The operating model assumes a mature regulated-fintech organisation with Executive, Payment Operations, Compliance and Legal, Risk and Fraud, Finance and Treasury, Technology, Customer Experience, Product and Design, Growth and Partnerships, People and Administration, and Internal Audit. Technology retains its specialist sub-departments: Product Engineering, DevOps and SRE, Cybersecurity, Data and Analytics, Quality Assurance, and IT Support.

In the release workflow, a transaction with every required check passed is automatically released and must not wait for human approval. Amber and red states show the exact failed control, assigned owner, next action and SLA. Payment retries reuse an idempotency key, check prior payout status and reconcile the final partner webhook to prevent duplicate releases.

The customer portal sidebar starts with Home, then Create payment, Transactions and Disputes. Messages, Agents and Settings are full customer destinations below the core payment journey. Help & support and Sign out remain anchored at the bottom of the sidebar, matching the approved visual reference. Signing out must return to the public ProofPay landing page and reset the customer view to Home.

Customer Messages keeps transaction-linked conversations with sellers, ProofPay Support and verified agents. The Agents page must repeat the rule that agents can guide customers but cannot ask for a MoMo PIN or personally approve payment, release or refund. Settings covers Profile, Security, Payment methods, Notifications and Accessibility. Help & support includes FAQs, chat, phone, USSD, agent routing and a support-request form.

The customer sidebar places “Use basic phone / USSD” directly under Settings and uses the short code `*719#`. The pitch demo must behave like a real feature phone: begin on the handset dialler, require the user to press `*719#` and the green call key, run the complete numbered USSD menu flow, accept a transaction confirmation code, support release and dispute outcomes, show session timing, and allow the red end key to close the session. It must always state that the ProofPay confirmation code is not the mobile-money PIN.
