import { describe, it, expect } from "vitest";
import type { Response } from "express";
import { sendSuccess, sendError, ApiResponseSuccess, ApiResponseError } from "../../src/lib/http.js";

function createMockResponse() {
  let statusCode = 200;
  let jsonBody: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: any) {
      jsonBody = body;
      return res;
    },
    getStatusCode: () => statusCode,
    getJsonBody: () => jsonBody,
  };

  return res as unknown as Response & { getStatusCode: () => number; getJsonBody: () => any };
}

describe("HTTP Response Helpers (http.ts)", () => {
  it("should create standard sendSuccess envelope", () => {
    const res = createMockResponse();
    sendSuccess(res, 200, { foo: "bar" }, "Operation completed");
    
    expect(res.getStatusCode()).toBe(200);

    const body: ApiResponseSuccess<{ foo: string }> = res.getJsonBody();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ foo: "bar" });
    expect(body.message).toBe("Operation completed");
  });

  it("should create standard sendError envelope", () => {
    const res = createMockResponse();
    sendError(res, 400, "INVALID_INPUT", "Input validation failed", { field: "email" });

    expect(res.getStatusCode()).toBe(400);

    const body: ApiResponseError = res.getJsonBody();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.message).toBe("Input validation failed");
    expect(body.error.details).toEqual({ field: "email" });
  });
});
