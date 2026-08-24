import { forbidden, unauthorised } from "./errors.js";
import { parseCookies } from "./http.js";
import { sha256 } from "./crypto.js";
import { findSession } from "./repository.js";

export async function authenticate(req) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "proofpay_session";
  const token = parseCookies(req)[cookieName];
  if (!token) throw unauthorised();
  const user = await findSession(sha256(token));
  if (!user) throw unauthorised("Your session has expired. Please log in again.");
  return { user, token };
}

export function requireRole(user, ...roles) {
  if (!roles.some(role => user.roles?.includes(role))) throw forbidden();
}
