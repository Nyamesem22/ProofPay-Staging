import { endpoint } from "../_lib/handler.js";
import { readJson, sessionCookie, getIp } from "../_lib/http.js";
import { parse, registerSchema } from "../_lib/validation.js";
import { hashPassword, randomToken, sha256 } from "../_lib/crypto.js";
import { conflict } from "../_lib/errors.js";
import { createSession, createUserWithWallet, findUserByPhone, writeAudit } from "../_lib/repository.js";

const publicUser = user => ({ id: user.id, fullName: user.full_name, phone: user.phone_e164, accountType: user.account_type, roles: user.roles, verificationStatus: user.verification_status, preferredLanguage: user.preferred_language, isDemo: user.is_demo });

export default endpoint({
  methods: ["POST"], scope: "auth-register", limit: 5, windowSeconds: 900,
  handler: async (req, res, { requestId }) => {
    const input = parse(registerSchema, readJson(req));
    if (await findUserByPhone(input.phone)) throw conflict("An account already exists for this mobile number. Log in instead.");
    const passwordHash = await hashPassword(input.password);
    let created;
    try { created = await createUserWithWallet({ ...input, passwordHash }); }
    catch (error) { if (error.code === "23505") throw conflict("An account already exists for this mobile number."); throw error; }
    const token = randomToken();
    const ttlHours = Math.min(168, Math.max(1, Number(process.env.SESSION_TTL_HOURS || 12)));
    await createSession({ userId: created.user.id, tokenHash: sha256(token), ipHash: sha256(getIp(req)), userAgentHash: sha256(req.headers["user-agent"] || "unknown"), expiresAt: new Date(Date.now() + ttlHours * 3600000) });
    await writeAudit({ requestId, actorUserId: created.user.id, action: "auth.register", entityType: "user", entityId: created.user.id, result: "success", ipHash: sha256(getIp(req)), metadata: { provider: input.provider, demo: true } });
    res.setHeader("Set-Cookie", sessionCookie(token, ttlHours * 3600));
    return { status: 201, data: { user: publicUser(created.user), wallet: created.wallet, mode: "database-demo" } };
  },
});
