#!/usr/bin/env node
import { hashPassword } from "../api/_lib/crypto.js";
import { db } from "../api/_lib/db.js";
import { createUserWithWallet, findUserByPhone } from "../api/_lib/repository.js";

const fullName = process.env.ADMIN_FULL_NAME;
const phone = process.env.ADMIN_PHONE;
const password = process.env.ADMIN_PASSWORD;
if (!fullName || !phone || !password || !process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL, ADMIN_FULL_NAME, ADMIN_PHONE and ADMIN_PASSWORD before running this command.");
  process.exit(1);
}

if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  console.error("ADMIN_PASSWORD must have 12+ characters with uppercase, lowercase, number and symbol.");
  process.exit(1);
}

const normalisedPhone = phone.startsWith("+233") ? phone : phone.replace(/^0/, "+233");
let user = await findUserByPhone(normalisedPhone);
if (!user) {
  const created = await createUserWithWallet({ fullName, phone: normalisedPhone, provider: "Staff account", passwordHash: await hashPassword(password) });
  user = created.user;
}

const sql = db();
await sql`UPDATE users SET account_type = 'staff', roles = ARRAY['customer','staff','admin']::text[], verification_status = 'verified', is_demo = false, updated_at = now() WHERE id = ${user.id}`;
console.log(`Admin access prepared for ${normalisedPhone}.`);
