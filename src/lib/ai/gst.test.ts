import { describe, expect, it } from "vitest";
import { suggestHsn, suggestHsnForInvoice } from "./gst";

describe("GST / HSN suggestion engine", () => {
  it("suggests HSN for a consulting service", () => {
    const results = suggestHsn("Professional consulting services");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].hsnCode).toBe("9983");
    expect(results[0].taxRate).toBe(18);
  });

  it("suggests HSN for software", () => {
    const results = suggestHsn("SaaS subscription license");
    expect(results[0].hsnCode).toBe("9973");
    expect(results[0].taxRate).toBe(18);
  });

  it("suggests HSN for food services", () => {
    const results = suggestHsn("Restaurant catering services");
    expect(results[0].taxRate).toBe(5);
  });

  it("returns empty for unknown descriptions", () => {
    const results = suggestHsn("zzzzunknownxyz");
    expect(results.length).toBe(0);
  });

  it("suggests HSN for multiple lines and deduplicates", () => {
    const results = suggestHsnForInvoice([
      { description: "Consulting services" },
      { description: "Software license" },
    ]);
    const codes = results.map((r) => r.hsnCode);
    expect(codes).toContain("9983");
    expect(codes).toContain("9973");
  });

  it("deduplicates same HSN codes across lines", () => {
    const results = suggestHsnForInvoice([
      { description: "Consulting services" },
      { description: "Professional service fee" },
    ]);
    const codes = results.map((r) => r.hsnCode);
    expect(codes.filter((c) => c === "9983").length).toBe(1);
  });
});
