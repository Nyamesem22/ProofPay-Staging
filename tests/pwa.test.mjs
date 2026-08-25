import { describe, expect, it } from "vitest";
import { readFile, stat } from "node:fs/promises";

describe("installable ProofPay PWA", () => {
  it("provides a valid standalone manifest and required icons", async () => {
    const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
    expect(manifest.name).toContain("ProofPay");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]));
    for (const icon of manifest.icons) {
      const file = await stat(new URL(`../public${icon.src}`, import.meta.url));
      expect(file.size).toBeGreaterThan(1000);
    }
  });

  it("links the manifest and registers an offline service worker", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
    const entry = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
    const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(entry).toContain('serviceWorker.register("/sw.js", { updateViaCache: "none" })');
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain("caches.match");
  });

  it("uses the current customer and public ProofPay marks", async () => {
    const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
    const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(app).toContain('className="app-bar-brand-mark" src="/assets/proofpay-app-mark-transparent.png"');
    expect(app).toContain('className="public-brand" aria-label="ProofPay home"><img src="/assets/proofpay-horizontal.png"');
    expect(app).toContain('<section className="public-final-cta"><img src="/assets/proofpay-icon.png"');
    expect(styles).toContain(".app-bar-brand-mark{width:68px");
  });
});
