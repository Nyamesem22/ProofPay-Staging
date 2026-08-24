import login from "../../server/auth/login.js";
import logout from "../../server/auth/logout.js";
import register from "../../server/auth/register.js";
import session from "../../server/auth/session.js";
import { getRequestId, sendJson } from "../_lib/http.js";

const handlers = { login, logout, register, session };

export default async function authRouter(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  const handler = handlers[action];
  if (handler) return handler(req, res);

  const requestId = getRequestId(req);
  return sendJson(res, 404, {
    ok: false,
    error: { code: "NOT_FOUND", message: "The requested authentication endpoint does not exist." },
    requestId,
  }, requestId);
}
