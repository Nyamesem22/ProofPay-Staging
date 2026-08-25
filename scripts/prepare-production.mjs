const adminKeys = ["ADMIN_FULL_NAME", "ADMIN_PHONE", "ADMIN_PASSWORD"];
const configuredAdminKeys = adminKeys.filter(key => Boolean(process.env[key]));

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL is not available during this build; runtime schema checks remain enabled.");
} else {
  await import("./migrate.mjs");
  if (configuredAdminKeys.length === adminKeys.length) await import("./create-admin.mjs");
  else if (configuredAdminKeys.length > 0) throw new Error("ADMIN_FULL_NAME, ADMIN_PHONE and ADMIN_PASSWORD must be configured together.");
}
