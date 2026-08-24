const allowLocalDemo = import.meta.env.VITE_ALLOW_LOCAL_DEMO !== "false";
const localUsersKey = "proofpay.demo.users.v1";
const localSessionKey = "proofpay.demo.session.v1";
const localTransactionsKey = "proofpay.demo.transactions.v1";

function makeId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10).join("")}`;
}

async function digest(value) {
  if (!crypto.subtle) {
    let hash = 2166136261;
    for (const character of value) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `local-demo-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });
  const payload = await response.json().catch(() => ({ ok: false, error: { code: "INVALID_RESPONSE", message: "The server returned an unreadable response." } }));
  if (!response.ok || payload.ok !== true) {
    const error = new Error(payload.error?.message || "ProofPay could not complete this request.");
    error.code = payload.error?.code;
    error.status = payload.error?.code === "INVALID_RESPONSE" ? 404 : response.status;
    error.details = payload.error?.details;
    throw error;
  }
  return payload.data;
}

function publicLocalUser(user) {
  return { id: user.id, fullName: user.fullName, phone: user.phone, provider: user.provider, roles: user.roles, accountType: user.accountType, verificationStatus: user.verificationStatus, isDemo: true };
}

async function createLocalAccount(input) {
  const users = read(localUsersKey, []);
  const phone = input.phone.replace(/[\s()-]/g, "");
  if (!input.fullName?.trim()) throw new Error("Enter your full name.");
  if (input.password.length < 12 || !/[a-z]/.test(input.password) || !/[A-Z]/.test(input.password) || !/\d/.test(input.password) || !/[^A-Za-z0-9]/.test(input.password)) throw new Error("Use at least 12 characters with uppercase, lowercase, a number and a symbol.");
  if (users.some(user => user.phone === phone)) throw new Error("A demo account already exists for this mobile number. Log in instead.");
  const salt = makeId();
  const user = { id: makeId(), fullName: input.fullName, phone, provider: input.provider, passwordHash: await digest(`${salt}:${input.password}`), salt, roles: ["customer"], accountType: "individual", verificationStatus: "demo", isDemo: true, mode: "browser-demo" };
  users.push(user);
  write(localUsersKey, users);
  write(localSessionKey, { userId: user.id, createdAt: new Date().toISOString() });
  return { user: publicLocalUser(user), mode: "browser-demo" };
}

async function loginLocalAccount(input) {
  const phone = input.phone.replace(/[\s()-]/g, "");
  const user = read(localUsersKey, []).find(candidate => candidate.phone === phone);
  if (!user || user.passwordHash !== await digest(`${user.salt}:${input.password}`)) throw new Error("The mobile number or password is incorrect.");
  write(localSessionKey, { userId: user.id, createdAt: new Date().toISOString() });
  return { user: publicLocalUser(user), mode: "browser-demo" };
}

function canFallback(error) {
  return allowLocalDemo && (!error.status || error.status === 404 || error.status === 503 || error.code === "SERVICE_NOT_CONFIGURED" || error.code === "INVALID_RESPONSE");
}

export async function registerAccount(input) {
  const payload = { ...input, accepted: input.accepted ?? input.acceptedTerms };
  delete payload.acceptedTerms;
  try { return await request("/api/auth/register", { method: "POST", body: payload }); }
  catch (error) { if (canFallback(error)) return createLocalAccount(input); throw error; }
}

export async function loginAccount(input) {
  try { return await request("/api/auth/login", { method: "POST", body: input }); }
  catch (error) { if (canFallback(error)) return loginLocalAccount(input); throw error; }
}

export async function restoreAccount() {
  try { return await request("/api/auth/session"); }
  catch {
    if (!allowLocalDemo) return null;
    const session = read(localSessionKey, null);
    const user = session && read(localUsersKey, []).find(candidate => candidate.id === session.userId);
    return user ? { user: publicLocalUser(user), mode: "browser-demo" } : null;
  }
}

export async function logoutAccount() {
  try { await request("/api/auth/logout", { method: "POST", body: {} }); } catch { /* local demo or offline */ }
  localStorage.removeItem(localSessionKey);
}

export async function createProtectedTransaction(input) {
  const payload = {
    receiverName: input.receiverName ?? input.counterpartyName,
    receiverPhone: input.receiverPhone ?? input.counterpartyPhone,
    receiverProvider: input.receiverProvider ?? input.counterpartyProvider,
    itemDescription: input.itemDescription ?? input.item,
    amount: input.amount,
    currency: input.currency || "GHS",
    deliveryDueAt: input.deliveryDueAt ?? input.deliveryDate,
    inspectionHours: (input.inspectionHours ?? Number.parseInt(input.inspectionPeriod, 10)) || 24,
    requiredEvidence: input.requiredEvidence ?? input.evidenceRequired,
    releaseRule: input.releaseRule,
    demoMode: true,
  };
  try { return await request("/api/transactions", { method: "POST", body: payload }); }
  catch (error) {
    if (!canFallback(error)) throw error;
    const transaction = { id: makeId(), reference: `PP-DEMO-${Date.now().toString(36).toUpperCase()}`, status: "PROTECTED", isDemo: true, createdAt: new Date().toISOString(), ...input };
    const transactions = read(localTransactionsKey, []);
    transactions.unshift(transaction);
    write(localTransactionsKey, transactions.slice(0, 100));
    return { transaction, mode: "browser-demo" };
  }
}
