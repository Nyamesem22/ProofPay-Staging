import { beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};

const api = await import("../src/lib/proofpay-api.js");

beforeEach(() => {
  values.clear();
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("<!doctype html><html></html>", { status: 200, headers: { "Content-Type": "text/html" } }));
});

describe("browser-only pitch fallback", () => {
  it("creates, restores, logs out and logs back into an isolated demo account", async () => {
    const input = { fullName: "Kojo Mensah", phone: "055 123 4567", provider: "MTN MoMo", password: "ProofPay!2026", acceptedTerms: true };
    const created = await api.registerAccount(input);
    expect(created.mode).toBe("browser-demo");
    expect(created.user.fullName).toBe("Kojo Mensah");
    await expect(api.restoreAccount()).resolves.toMatchObject({ user: { phone: "0551234567" } });
    await api.logoutAccount();
    await expect(api.restoreAccount()).resolves.toBeNull();
    await expect(api.loginAccount({ phone: input.phone, password: input.password })).resolves.toMatchObject({ mode: "browser-demo" });
  });

  it("persists a protected demo transaction when the API is unavailable", async () => {
    const result = await api.createProtectedTransaction({ receiverName: "Ama Store", receiverPhone: "+233249876543", receiverProvider: "MTN MoMo", itemDescription: "Blender", amount: 300, currency: "GHS", deliveryDueAt: "2026-08-25", inspectionHours: 24, requiredEvidence: "Delivery photo", releaseRule: "Buyer confirms" });
    expect(result.mode).toBe("browser-demo");
    expect(result.transaction.status).toBe("PROTECTED");
  });
});
