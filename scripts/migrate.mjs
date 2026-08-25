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

function splitStatements(source) {
  const statements = [];
  let current = "";
  let quote = null;
  let dollarTag = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      current += char;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") { blockComment = false; current += "*/"; index += 1; }
      else current += char;
      continue;
    }
    if (!quote && !dollarTag && char === "-" && next === "-") { lineComment = true; current += "--"; index += 1; continue; }
    if (!quote && !dollarTag && char === "/" && next === "*") { blockComment = true; current += "/*"; index += 1; continue; }
    if (!quote && char === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        if (!dollarTag) dollarTag = match[0];
        else if (dollarTag === match[0]) dollarTag = null;
        current += match[0];
        index += match[0].length - 1;
        continue;
      }
    }
    if (!dollarTag && (char === "'" || char === '"')) {
      if (!quote) quote = char;
      else if (quote === char && next === char) { current += char + next; index += 1; continue; }
      else if (quote === char) quote = null;
      current += char;
      continue;
    }
    if (!quote && !dollarTag && char === ";") {
      const statement = current.trim();
      if (statement && !/^(BEGIN|COMMIT)$/i.test(statement)) statements.push(statement);
      current = "";
      continue;
    }
    current += char;
  }
  const remainder = current.trim();
  if (remainder && !/^(BEGIN|COMMIT)$/i.test(remainder)) statements.push(remainder);
  return statements;
}

for (const file of files) {
  const migration = await readFile(path.join(migrationsDir, file), "utf8");
  console.log(`Applying ${file}...`);
  const statements = splitStatements(migration);
  await sql.transaction(statements.map(statement => sql.query(statement)));
}

console.log(`Applied ${files.length} ProofPay database migration(s).`);
