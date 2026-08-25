import { randomUUID } from "node:crypto";
import { db } from "./db.js";

let operationsSchemaReady;
async function ensureOperationsSchema() {
  if (!operationsSchemaReady) {
    const sql = db();
    operationsSchemaReady = sql.transaction([
      sql`CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar(48) NOT NULL, title varchar(160) NOT NULL, message text NOT NULL, entity_type varchar(60),
        entity_id varchar(100), action_path varchar(200), read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`,
      sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL`,
    ]).catch(error => { operationsSchemaReady = null; throw error; });
  }
  await operationsSchemaReady;
}

export async function findUserByPhone(phone) {
  const sql = db();
  const rows = await sql`SELECT * FROM users WHERE phone_e164 = ${phone} LIMIT 1`;
  return rows[0] || null;
}

export async function createUserWithWallet({ fullName, phone, provider, passwordHash }) {
  await ensureOperationsSchema();
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
    sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
        VALUES (${userId}, 'account.created', 'Welcome to ProofPay', 'Your account was created and saved securely.', 'user', ${userId}, '/dashboard')`,
    sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
        SELECT id, 'admin.member.created', 'New member registered', ${`${fullName} created a ProofPay account.`}, 'user', ${userId}, '/admin?view=accounts'
        FROM users WHERE id <> ${userId} AND status = 'active' AND roles && ARRAY['staff','admin']::text[]`,
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
  await ensureOperationsSchema();
  const sql = db();
  const id = randomUUID();
  const ref = reference();
  const amountMinor = Math.round(input.amount * 100);
  const feeMinor = Math.round(input.amount * 0.015 * 100);
  const status = input.demoMode ? "PROTECTED" : "AWAITING_PAYMENT";
  const [rows] = await sql.transaction([
    sql`INSERT INTO transactions (id, reference, buyer_user_id, receiver_name, receiver_phone_e164,
      receiver_provider, item_description, amount_minor, fee_minor, currency, delivery_due_at, inspection_hours,
      required_evidence, release_rule, agreement_type, agreement_statement, automatic_agreement_confirmation, status, is_demo, protected_at)
      VALUES (${id}, ${ref}, ${user.id}, ${input.receiverName}, ${input.receiverPhone}, ${input.receiverProvider},
      ${input.itemDescription}, ${amountMinor}, ${feeMinor}, ${input.currency.toUpperCase()}, ${input.deliveryDueAt.toISOString()},
      ${input.inspectionHours}, ${input.requiredEvidence}, ${input.releaseRule}, ${input.agreementType}, ${input.agreementStatement}, ${input.automaticAgreementConfirmation}, ${status}, ${input.demoMode}, ${input.demoMode ? new Date().toISOString() : null})
      RETURNING *`,
    sql`INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
      VALUES (${id}, ${input.demoMode ? "DEMO_PAYMENT_PROTECTED" : "TRANSACTION_CREATED"}, ${user.id}, ${JSON.stringify({ channel: "web" })}::jsonb)`,
    sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
      VALUES (${user.id}, 'transaction.created', 'Payment protected', ${`${ref} is now protected.`}, 'transaction', ${id}, '/dashboard?view=transactions')`,
    sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
      SELECT id, 'admin.transaction.created', 'New protected payment', ${`${ref} was created by ${user.full_name}.`}, 'transaction', ${id}, '/admin?view=transactions'
      FROM users WHERE status = 'active' AND roles && ARRAY['staff','admin']::text[]`,
  ], { isolationMode: "Serializable" });
  return rows[0];
}

export async function listTransactionsForUser(userId) {
  const sql = db();
  return sql`SELECT id, reference, receiver_name, receiver_provider, item_description, amount_minor, fee_minor, currency,
    delivery_due_at, inspection_hours, required_evidence, release_rule, agreement_type, agreement_statement, automatic_agreement_confirmation, status, is_demo, protected_at, released_at, created_at
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
  await ensureOperationsSchema();
  const sql = db();
  const caseReference = `DSP-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomUUID().slice(0, 5).toUpperCase()}`;
  const disputeId = randomUUID();
  const [disputes] = await sql.transaction([
    sql`INSERT INTO disputes (id, case_reference, transaction_id, opened_by, reason, description)
        VALUES (${disputeId}, ${caseReference}, ${transaction.id}, ${userId}, ${input.reason}, ${input.description}) RETURNING *`,
    sql`UPDATE transactions SET status = 'DISPUTED', updated_at = now(), version = version + 1 WHERE id = ${transaction.id}`,
    sql`INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
        VALUES (${transaction.id}, 'DISPUTE_OPENED', ${userId}, ${JSON.stringify({ caseReference, reason: input.reason })}::jsonb)`,
    sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
        VALUES (${userId}, 'dispute.opened', 'Problem report received', ${`${caseReference} is open and the payment remains protected.`}, 'dispute', ${disputeId}, '/dashboard?view=disputes')`,
    sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
        SELECT id, 'admin.dispute.opened', 'New dispute needs follow-up', ${`${caseReference}: ${input.reason}`}, 'dispute', ${disputeId}, '/admin?view=disputes'
        FROM users WHERE status = 'active' AND roles && ARRAY['staff','admin']::text[]`,
  ], { isolationMode: "Serializable" });
  return disputes[0];
}

export async function listDisputesForUser(userId) {
  const sql = db();
  return sql`SELECT d.*, t.reference AS transaction_reference, t.item_description, t.amount_minor, t.currency,
    t.receiver_name, t.status AS transaction_status
    FROM disputes d JOIN transactions t ON t.id = d.transaction_id
    WHERE d.opened_by = ${userId} OR t.buyer_user_id = ${userId} OR t.receiver_user_id = ${userId}
    ORDER BY d.created_at DESC LIMIT 100`;
}

export async function listNotifications(userId) {
  await ensureOperationsSchema();
  const sql = db();
  const [notifications, counts] = await sql.transaction([
    sql`SELECT id, type, title, message, entity_type, entity_id, action_path, read_at, created_at
        FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT count(*)::int AS unread_count FROM notifications WHERE user_id = ${userId} AND read_at IS NULL`,
  ], { readOnly: true });
  return { notifications, unreadCount: counts[0]?.unread_count || 0 };
}

export async function markNotificationsRead(userId, { id, all }) {
  await ensureOperationsSchema();
  const sql = db();
  const rows = all
    ? await sql`UPDATE notifications SET read_at = coalesce(read_at, now()) WHERE user_id = ${userId} AND read_at IS NULL RETURNING id`
    : await sql`UPDATE notifications SET read_at = coalesce(read_at, now()) WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
  return rows.length;
}

export async function adminOperations() {
  await ensureOperationsSchema();
  const sql = db();
  const [transactionRows, accountRows, disputeRows, auditRows] = await sql.transaction([
    sql`SELECT t.*, buyer.full_name AS buyer_name
        FROM transactions t JOIN users buyer ON buyer.id = t.buyer_user_id
        ORDER BY t.created_at DESC LIMIT 250`,
    sql`SELECT u.id, u.full_name, u.phone_e164, u.account_type, u.roles, u.status, u.verification_status, u.is_demo,
        u.last_login_at, u.created_at, w.provider, w.wallet_phone_e164, w.status AS wallet_status,
        coalesce(stats.lifetime_minor, 0)::bigint AS lifetime_minor, coalesce(stats.active_count, 0)::int AS active_count
        FROM users u
        LEFT JOIN LATERAL (SELECT provider, wallet_phone_e164, status FROM wallets WHERE user_id = u.id ORDER BY created_at LIMIT 1) w ON true
        LEFT JOIN LATERAL (SELECT sum(amount_minor) AS lifetime_minor,
          count(*) FILTER (WHERE status NOT IN ('RELEASED','REFUNDED','CANCELLED','FAILED')) AS active_count
          FROM transactions WHERE buyer_user_id = u.id OR receiver_user_id = u.id) stats ON true
        ORDER BY u.created_at DESC LIMIT 250`,
    sql`SELECT d.*, t.reference AS transaction_reference, t.item_description, t.amount_minor, t.currency,
        t.receiver_name, t.status AS transaction_status, opener.full_name AS opened_by_name,
        resolver.full_name AS resolved_by_name
        FROM disputes d JOIN transactions t ON t.id = d.transaction_id
        JOIN users opener ON opener.id = d.opened_by LEFT JOIN users resolver ON resolver.id = d.resolved_by
        ORDER BY d.updated_at DESC LIMIT 250`,
    sql`SELECT a.id, a.created_at, a.action, a.entity_type, a.entity_id, a.result, a.metadata,
        coalesce(u.full_name, 'ProofPay system') AS actor_name
        FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
        ORDER BY a.created_at DESC LIMIT 250`,
  ], { readOnly: true });
  return { transactions: transactionRows, accounts: accountRows, disputes: disputeRows, auditLogs: auditRows, generatedAt: new Date().toISOString() };
}

export async function updateAdminDispute(userId, id, status, note) {
  await ensureOperationsSchema();
  const sql = db();
  const resolution = status.startsWith("RESOLVED_") || status === "CLOSED" ? { note: note || "Updated by operations", outcome: status } : null;
  const transactionStatus = status === "RESOLVED_RELEASE" ? "RELEASED" : status === "RESOLVED_REFUND" ? "REFUNDED" : "DISPUTED";
  const resolved = status.startsWith("RESOLVED_") || status === "CLOSED";
  const [disputes] = await sql.transaction([
    sql`UPDATE disputes SET status = ${status}, resolution = ${resolution ? JSON.stringify(resolution) : null}::jsonb,
        resolved_by = ${resolved ? userId : null}, resolved_at = ${resolved ? new Date().toISOString() : null}, updated_at = now()
        WHERE id = ${id} RETURNING *`,
    sql`UPDATE transactions SET status = ${transactionStatus}, released_at = CASE WHEN ${status} = 'RESOLVED_RELEASE' THEN now() ELSE released_at END,
        updated_at = now(), version = version + 1 WHERE id = (SELECT transaction_id FROM disputes WHERE id = ${id})`,
    sql`INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
        SELECT transaction_id, 'DISPUTE_STATUS_CHANGED', ${userId}, ${JSON.stringify({ status, note: note || null })}::jsonb FROM disputes WHERE id = ${id}`,
    sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
        SELECT opened_by, 'dispute.updated', 'Dispute status updated', ${`Your dispute is now ${status.replaceAll("_", " ").toLowerCase()}.`}, 'dispute', id, '/dashboard?view=disputes'
        FROM disputes WHERE id = ${id}`,
  ], { isolationMode: "Serializable" });
  return disputes[0] || null;
}

export async function updateAdminUser(id, field, status) {
  await ensureOperationsSchema();
  const sql = db();
  const rows = field === "status"
    ? await sql`UPDATE users SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING id, full_name, status, verification_status`
    : await sql`UPDATE users SET verification_status = ${status}, updated_at = now() WHERE id = ${id} RETURNING id, full_name, status, verification_status`;
  if (rows[0]) await sql`INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
    VALUES (${id}, 'account.updated', 'Account status updated', ${field === "status" ? `Your account is now ${status}.` : `Your verification is now ${status}.`}, 'user', ${id}, '/dashboard?view=settings')`;
  return rows[0] || null;
}

export async function releaseAdminDemoTransaction(id, adminUserId) {
  await ensureOperationsSchema();
  const sql = db();
  const transactions = await sql`WITH updated AS (
      UPDATE transactions SET status = 'RELEASED', released_at = now(), updated_at = now(), version = version + 1
      WHERE id = ${id} AND is_demo = true AND status IN ('PROTECTED','DELIVERED','READY_TO_RELEASE') RETURNING *
    ), event AS (
      INSERT INTO transaction_events (transaction_id, event_type, actor_user_id, metadata)
      SELECT id, 'ADMIN_DEMO_PAYMENT_RELEASED', ${adminUserId}, ${JSON.stringify({ channel: "admin" })}::jsonb FROM updated
    ), customer_note AS (
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_path)
      SELECT buyer_user_id, 'transaction.released', 'Payment released', reference || ' has been released.', 'transaction', id, '/dashboard?view=transactions' FROM updated
    ) SELECT * FROM updated`;
  return transactions[0] || null;
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
  const [transactions, disputes, users, commands, recentTransactions, recentAccounts, recentDisputes, recentAudit] = await sql.transaction([
    sql`SELECT status, count(*)::int AS count, coalesce(sum(amount_minor),0)::bigint AS amount_minor FROM transactions GROUP BY status`,
    sql`SELECT status, count(*)::int AS count FROM disputes GROUP BY status`,
    sql`SELECT account_type, count(*)::int AS count FROM users GROUP BY account_type`,
    sql`SELECT status, count(*)::int AS count FROM payment_commands GROUP BY status`,
    sql`SELECT t.id, t.reference, t.item_description, t.receiver_name, t.receiver_provider, t.amount_minor, t.currency,
      t.status, t.required_evidence, t.created_at, t.updated_at, u.full_name AS buyer_name
      FROM transactions t JOIN users u ON u.id = t.buyer_user_id ORDER BY t.created_at DESC LIMIT 100`,
    sql`SELECT u.id, u.full_name, u.account_type, u.verification_status, u.status, u.phone_e164, u.created_at,
      w.provider, w.wallet_phone_e164, w.status AS wallet_status,
      count(t.id)::int AS transaction_count, coalesce(sum(t.amount_minor),0)::bigint AS lifetime_amount_minor
      FROM users u LEFT JOIN wallets w ON w.user_id = u.id LEFT JOIN transactions t ON t.buyer_user_id = u.id
      GROUP BY u.id, w.provider, w.wallet_phone_e164, w.status ORDER BY u.created_at DESC LIMIT 100`,
    sql`SELECT d.id, d.case_reference, d.transaction_id, d.reason, d.description, d.status, d.created_at,
      t.reference, t.amount_minor, t.currency, opener.full_name AS opened_by_name
      FROM disputes d JOIN transactions t ON t.id = d.transaction_id JOIN users opener ON opener.id = d.opened_by
      ORDER BY d.created_at DESC LIMIT 100`,
    sql`SELECT a.id, a.action, a.entity_type, a.entity_id, a.result, a.metadata, a.created_at,
      coalesce(u.full_name, 'ProofPay system') AS actor_name
      FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC LIMIT 100`,
  ], { readOnly: true });
  return { transactions, disputes, users, paymentCommands: commands, recentTransactions, recentAccounts, recentDisputes, recentAudit, generatedAt: new Date().toISOString() };
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
