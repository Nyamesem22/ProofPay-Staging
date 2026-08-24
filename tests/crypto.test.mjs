import { describe, expect, it } from "vitest";
import { hashPassword, randomToken, sha256, verifyPassword } from "../api/_lib/crypto.js";

describe("authentication cryptography", () => {
  it("hashes passwords with a unique salt and verifies only the right value", async () => {
    const first = await hashPassword("ProofPay!2026");
    const second = await hashPassword("ProofPay!2026");
    expect(first).not.toBe(second);
    await expect(verifyPassword("ProofPay!2026", first)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword!1", first)).resolves.toBe(false);
  });

  it("creates strong opaque tokens and stable SHA-256 digests", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(sha256("proofpay")).toHaveLength(64);
  });
});
