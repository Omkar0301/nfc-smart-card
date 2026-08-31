import { describe, it, expect } from "vitest";
import { config } from "../../src/config.js";

describe("Environment Configuration (config.ts)", () => {
  it("should validate all required configuration properties and defaults", () => {
    expect(config.NODE_ENV).toBeDefined();
    expect(typeof config.PORT).toBe("number");
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.LOG_LEVEL).toBeDefined();
    expect(config.LOG_DIR).toBeDefined();
    expect(config.DATABASE_URL).toBeDefined();
    expect(config.JWT_SECRET).toBeDefined();
    expect(config.JWT_REFRESH_SECRET).toBeDefined();
    expect(config.OTP_PEPPER).toBeDefined();
  });
});
