import { randomUUID } from "node:crypto";
import { db } from "./db.js";

export async function findUserByPhone(phone) {
  const sql = db();
  const rows = await sql`SELECT * FROM users WHERE phone_e164 = ${phone} LIMIT 1`;
  return rows[0] || null;
}

export async function createUserWithWallet({ fullName, phone, provider, passwordHash }) {
  const sql = db();
  const userId = randomUUID();
  const walletId = randomUUID();
  const queries = [
    sql`INSERT INTO users (id, full_name, phone_e164, password_hash, verification_status, is_demo)
        VALUES (${userId}, ${fullName}, ${phone}, ${passwordHash}, 'demo', true)
        RETURNING id, full_name, phone_e164, account_type, roles, status, verification_status, preferred_language, is_demo, created_at`,
    sql`INSERT INTO wallets (id, user_id, provider, wallet_phone_e164, wallet_name, status)
        VALUES (${walletId}, ${userId}, ${provider}, ${phone}, ${fullName}, 'demo')
        RETURNING id, provider, wallet_phone_e164, wallet_name, status`,
  ];
  const [users, wallets] = await sql.transaction(queries, { isolationMode: "Serializable" });
  return { user: users[0], wallet: wallets[0] };
}

export async function createSession({ userId, tokenHash, ipHash, userAgentHash, expiresAt }) {
  const sql = db();
  await sql`INSERT INTO sessions (user_id, token_hash, ip_hash, user_agent_hash, expires_at)
            VALUES (${userId}, ${tokenHash}, ${ipHash}, ${userAgentHash}, ${expiresAt.toISOString()})`;
  await sql`UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = ${userId}`;
}

export async function findSession(tokenHash) {
  const sql = db();
  const rows = await sql`SELECT s.id AS session_id, s.expires_at, u.id, u.full_name, u.phone_e164, u.account_type,
    u.roles, u.status, u.verification_status, u.preferred_language, u.is_demo
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'
    LIMIT 1`;
  return rows[0] || null;
}

export async function revokeSession(tokenHash) {
  const sql = db();
  await sql`UPDATE sessions SET revoked_at = now() WHERE token_hash = ${tokenHash} AND revoked_at IS NULL`;
}

export async function writeAudit({ requestId, actorUserId, action, entityType, entityId, result, ipHash, metadata = {} }) {
  const sql = db();
  await sql`INSERT INTO audit_logs (request_id, actor_user_id, action, entity_type, entity_id, result, ip_hash, metadata)
    VALUES (${requestId || null}, ${actorUserId || null}, ${action}, ${entityType}, ${entityId || null}, ${result}, ${ipHash || null}, ${JSON.stringify(metadata)}::jsonb)`;
}

function reference() {
  const day = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `PP-${day}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function createTransactionRecord(user, input) {
  const sql = db();
  const id = randomUUID();
  const ref = reference();
  const amountMinor = Math.round(input.amount * 100);
  const feeMinor = Math.round(input.amount * 0.015 * 100);
  const status = input.demoMode ? "PROTECTED" : "AWAITING_PAYMENT";
  const rows = await sql`INSERT INTO transactions (id, reference, buyer_user_id, receiver_name, receiver_phone_e164,
    receiver_provider, item_description, amount_minor, fee_minor, currency, delivery_due_at, inspection_hours,
    required_evidence, release_rule, status, is_demo, protected_at)
    VALUES (${id}, ${ref}, ${user.id}, ${input.receiverName}, ${input.receiverPhone}, ${input.receiverProvider},
    ${input.itemDescription}, ${amountMinor}, ${feeMinor}, ${input.currency.toUpperCase()}, ${input.deliveryDueAt.toISOString()},
    ${input.inspectionHours}, ${input.requiredEvidence}, ${input.releaseRule}, ${status}, ${input.demoMode}, ${input.demoMode ? new Date().toISOString() : null})
    RETURNING *`;
  await sql`INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
    VALUES (${id}, ${input.demoMode ? "DEMO_PAYMENT_PROTECTED" : "TRANSACTION_CREATED"}, ${user.id}, ${JSON.stringify({ channel: "web" })}::jsonb)`;
  return rows[0];
}

export async function listTransactionsForUser(userId) {
  const sql = db();
  return sql`SELECT id, reference, receiver_name, receiver_provider, item_description, amount_minor, fee_minor, currency,
    delivery_due_at, inspection_hours, required_evidence, release_rule, status, is_demo, protected_at, released_at, created_at
    FROM transactions WHERE buyer_user_id = ${userId} OR receiver_user_id = ${userId} ORDER BY created_at DESC LIMIT 100`;
}

export async function findTransactionForUser(id, userId) {
  const sql = db();
  const rows = await sql`SELECT * FROM transactions WHERE id = ${id} AND (buyer_user_id = ${userId} OR receiver_user_id = ${userId}) LIMIT 1`;
  return rows[0] || null;
}

export async function releaseDemoTransaction(id, userId) {
  const sql = db();
  const rows = await sql`UPDATE transactions SET status = 'RELEASED', released_at = now(), updated_at = now(), version = version + 1
    WHERE id = ${id} AND buyer_user_id = ${userId} AND is_demo = true AND status IN ('PROTECTED','DELIVERED','READY_TO_RELEASE')
    RETURNING *`;
  if (!rows[0]) return null;
  await sql`INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
    VALUES (${id}, 'DEMO_PAYMENT_RELEASED', ${userId}, ${JSON.stringify({ simulated: true })}::jsonb)`;
  return rows[0];
}

export async function openDisputeRecord(transaction, userId, input) {
  const sql = db();
  const caseReference = `DSP-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomUUID().slice(0, 5).toUpperCase()}`;
  const disputeId = randomUUID();
  const [disputes] = await sql.transaction([
    sql`INSERT INTO disputes (id, case_reference, transaction_id, opened_by, reason, description)
        VALUES (${disputeId}, ${caseReference}, ${transaction.id}, ${userId}, ${input.reason}, ${input.description}) RETURNING *`,
    sql`UPDATE transactions SET status = 'DISPUTED', updated_at = now(), version = version + 1 WHERE id = ${transaction.id}`,
    sql`INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
        VALUES (${transaction.id}, 'DISPUTE_OPENED', ${userId}, ${JSON.stringify({ caseReference, reason: input.reason })}::jsonb)`,
  ], { isolationMode: "Serializable" });
  return disputes[0];
}

export async function saveEvidenceRecord({ transactionId, userId, blob }) {
  const sql = db();
  const rows = await sql`INSERT INTO evidence (transaction_id, uploaded_by, blob_url, pathname, content_type, size_bytes, status)
    VALUES (${transactionId}, ${userId}, ${blob.url}, ${blob.pathname}, ${blob.contentType || "application/octet-stream"}, ${blob.size || 1}, 'received')
    RETURNING *`;
  await sql`INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
    VALUES (${transactionId}, 'EVIDENCE_UPLOADED', ${userId}, ${JSON.stringify({ pathname: blob.pathname, contentType: blob.contentType, size: blob.size })}::jsonb)`;
  return rows[0];
}

export async function recordWebhook({ provider, providerEventId, signatureValid, payloadHash }) {
  const sql = db();
  const rows = await sql`INSERT INTO webhook_receipts (provider, provider_event_id, signature_valid, payload_hash)
    VALUES (${provider}, ${providerEventId}, ${signatureValid}, ${payloadHash})
    ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING *`;
  return rows[0] || null;
}

export async function adminOverview() {
  const sql = db();
  const [transactions, disputes, users, commands] = await sql.transaction([
    sql`SELECT status, count(*)::int AS count, coalesce(sum(amount_minor),0)::bigint AS amount_minor FROM transactions GROUP BY status`,
    sql`SELECT status, count(*)::int AS count FROM disputes GROUP BY status`,
    sql`SELECT account_type, count(*)::int AS count FROM users GROUP BY account_type`,
    sql`SELECT status, count(*)::int AS count FROM payment_commands GROUP BY status`,
  ], { readOnly: true });
  return { transactions, disputes, users, paymentCommands: commands, generatedAt: new Date().toISOString() };
}

export async function listStaffReports() {
  const sql = db();
  return sql`SELECT r.*, u.full_name AS staff_name FROM staff_reports r JOIN users u ON u.id = r.staff_user_id ORDER BY report_date DESC, created_at DESC LIMIT 100`;
}

export async function upsertStaffReport(userId, input) {
  const sql = db();
  const rows = await sql`INSERT INTO staff_reports (staff_user_id, department, report_date, summary, metrics, incidents, handover, status, submitted_at)
    VALUES (${userId}, ${input.department}, ${input.reportDate}, ${input.summary}, ${JSON.stringify(input.metrics || {})}::jsonb, ${input.incidents || null}, ${input.handover || null}, ${input.status}, ${input.status === "SUBMITTED" ? new Date().toISOString() : null})
    ON CONFLICT (staff_user_id, report_date) DO UPDATE SET department = excluded.department, summary = excluded.summary,
      metrics = excluded.metrics, incidents = excluded.incidents, handover = excluded.handover, status = excluded.status,
      submitted_at = excluded.submitted_at, updated_at = now()
    RETURNING *`;
  return rows[0];
}
