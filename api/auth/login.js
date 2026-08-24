import { endpoint } from "../_lib/handler.js";
import { readJson, sessionCookie, getIp } from "../_lib/http.js";
import { parse, loginSchema } from "../_lib/validation.js";
import { verifyPassword, randomToken, sha256 } from "../_lib/crypto.js";
import { unauthorised } from "../_lib/errors.js";
import { createSession, findUserByPhone, writeAudit } from "../_lib/repository.js";

const publicUser = user => ({ id: user.id, fullName: user.full_name, phone: user.phone_e164, accountType: user.account_type, roles: user.roles, verificationStatus: user.verification_status, preferredLanguage: user.preferred_language, isDemo: user.is_demo });

export default endpoint({
  methods: ["POST"], scope: "auth-login", limit: 8, windowSeconds: 900,
  handler: async (req, res, { requestId }) => {
    const input = parse(loginSchema, readJson(req));
    const user = await findUserByPhone(input.phone);
    const valid = user ? await verifyPassword(input.password, user.password_hash) : false;
    if (!valid || user.status !== "active") throw unauthorised("The mobile number or password is incorrect.");
    const token = randomToken();
    const ttlHours = Math.min(168, Math.max(1, Number(process.env.SESSION_TTL_HOURS || 12)));
    await createSession({ userId: user.id, tokenHash: sha256(token), ipHash: sha256(getIp(req)), userAgentHash: sha256(req.headers["user-agent"] || "unknown"), expiresAt: new Date(Date.now() + ttlHours * 3600000) });
    await writeAudit({ requestId, actorUserId: user.id, action: "auth.login", entityType: "session", result: "success", ipHash: sha256(getIp(req)) });
    res.setHeader("Set-Cookie", sessionCookie(token, ttlHours * 3600));
    return { data: { user: publicUser(user), mode: "database" } };
  },
});
