import { describe, expect, it } from "vitest";
import { bankOptions, detectMobileProvider, maskPhone, mobileProviderOptions, normalizeLocalPhone } from "../src/lib/payment-parties.js";

describe("payment party helpers", () => {
  it("detects the Ghana provider from common local and international prefixes", () => {
    expect(detectMobileProvider("GH", "024 987 6543")).toBe("MTN MoMo");
    expect(detectMobileProvider("GH", "+233 20 123 4567")).toBe("Telecel Cash");
    expect(detectMobileProvider("GH", "0261234567")).toBe("AT Money");
  });

  it("supports the additional regional wallet choices and unknown prefixes", () => {
    expect(detectMobileProvider("TG", "096 12 34 56")).toBe("Moov Flooz");
    expect(detectMobileProvider("TG", "090 12 34 56")).toBe("Mixx by Yas");
    expect(detectMobileProvider("GH", "011 123 4567")).toBe("");
  });

  it("normalises and masks party phone numbers without exposing the full value", () => {
    expect(normalizeLocalPhone("GH", "+233 55 123 4567")).toBe("0551234567");
    expect(maskPhone("055 123 4567")).toBe("055 *** 4567");
  });

  it("offers regional manual fallbacks and the reference Ghana bank choices", () => {
    expect(mobileProviderOptions).toContain("AirtelTigo Money");
    expect(mobileProviderOptions).toContain("MoMo PSB");
    expect(bankOptions).toContain("Access Bank (Ghana) Plc");
    expect(bankOptions).toContain("Agricultural Development Bank Plc");
  });
});
