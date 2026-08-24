import { neon } from "@neondatabase/serverless";
import { requireDatabaseUrl } from "./env.js";

let cachedSql;

export function db() {
  if (!cachedSql) cachedSql = neon(requireDatabaseUrl(), { fullResults: false });
  return cachedSql;
}

export function resetDbForTests() {
  cachedSql = undefined;
}
