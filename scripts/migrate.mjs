#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Copy the pooled Neon connection string into your environment first.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "database", "migrations");
const files = (await readdir(migrationsDir)).filter(file => file.endsWith(".sql")).sort();
const sql = neon(process.env.DATABASE_URL);

for (const file of files) {
  const migration = await readFile(path.join(migrationsDir, file), "utf8");
  console.log(`Applying ${file}...`);
  await sql.query(migration);
}

console.log(`Applied ${files.length} ProofPay database migration(s).`);
