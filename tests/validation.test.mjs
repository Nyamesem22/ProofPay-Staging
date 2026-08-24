import { describe, expect, it } from "vitest";
import { parse, registerSchema, transactionSchema } from "../api/_lib/validation.js";

describe("request validation", () => {
  it("normalises Ghana phone numbers and accepts a strong registration", () => {
    const result = parse(registerSchema, { fullName: "Kojo Mensah", phone: "055 123 4567", provider: "MTN MoMo", password: "ProofPay!2026", accepted: true });
    expect(result.phone).toBe("+233551234567");
  });

  it("rejects weak passwords", () => {
    expect(() => parse(registerSchema, { fullName: "Kojo Mensah", phone: "+233551234567", provider: "MTN MoMo", password: "password1234", accepted: true })).toThrow("Please correct");
  });

  it("bounds protected payment values", () => {
    const base = { receiverName: "Ama Store", receiverPhone: "+233249876543", receiverProvider: "MTN MoMo", itemDescription: "Blender", currency: "GHS", deliveryDueAt: "2026-08-25T12:00:00Z", inspectionHours: 24, requiredEvidence: "Delivery photo", releaseRule: "Buyer confirms", demoMode: true };
    expect(parse(transactionSchema, { ...base, amount: 300 }).amount).toBe(300);
    expect(() => parse(transactionSchema, { ...base, amount: -1 })).toThrow();
  });
});
