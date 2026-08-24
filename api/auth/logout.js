import { endpoint } from "../_lib/handler.js";
import { clearSessionCookie, parseCookies } from "../_lib/http.js";
import { revokeSession } from "../_lib/repository.js";
import { sha256 } from "../_lib/crypto.js";

export default endpoint({
  methods: ["POST"], scope: "auth-logout", limit: 30, windowSeconds: 60,
  handler: async (req, res) => {
    const cookieName = process.env.SESSION_COOKIE_NAME || "proofpay_session";
    const token = parseCookies(req)[cookieName];
    if (token) await revokeSession(sha256(token));
    res.setHeader("Set-Cookie", clearSessionCookie());
    return { data: { loggedOut: true } };
  },
});
