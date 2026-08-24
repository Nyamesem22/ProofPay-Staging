import { endpoint } from "../_lib/handler.js";
import { authenticate } from "../_lib/auth.js";

export default endpoint({
  methods: ["GET"], scope: "auth-session", limit: 120, windowSeconds: 60,
  handler: async req => {
    const { user } = await authenticate(req);
    return { data: { user: { id: user.id, fullName: user.full_name, phone: user.phone_e164, accountType: user.account_type, roles: user.roles, verificationStatus: user.verification_status, preferredLanguage: user.preferred_language, isDemo: user.is_demo } } };
  },
});
