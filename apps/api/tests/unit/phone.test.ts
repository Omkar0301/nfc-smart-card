import { describe, it, expect } from "vitest";
import { normalizePhone } from "../../src/utils/phone.js";

describe("Phone Normalization (phone.ts)", () => {
  it("should normalize valid E.164 phone formats", () => {
    expect(normalizePhone("+1234567890")).toBe("+1234567890");
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("+1 (555) 000-1122")).toBe("+15550001122");
  });

  it("should format 10-digit phone numbers with default +91 prefix", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });

  it("should return null for invalid phone numbers", () => {
    expect(normalizePhone("invalid")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });
});
