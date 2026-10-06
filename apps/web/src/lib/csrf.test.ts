import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./csrf";

const tunnel = "https://ham-unexpected-profession-specialist.trycloudflare.com";

describe("isAllowedOrigin", () => {
  it("allows APP_URL itself", () => {
    expect(isAllowedOrigin(tunnel, tunnel, "development")).toBe(true);
    expect(isAllowedOrigin(`${tunnel}/`, tunnel, "production")).toBe(true);
  });

  it("allows localhost in development when APP_URL is a tunnel", () => {
    expect(
      isAllowedOrigin("http://localhost:3001", tunnel, "development"),
    ).toBe(true);
    expect(
      isAllowedOrigin("http://127.0.0.1:3001", tunnel, "development"),
    ).toBe(true);
  });

  it("rejects localhost in production", () => {
    expect(isAllowedOrigin("http://localhost:3001", tunnel, "production")).toBe(
      false,
    );
  });

  it("rejects random origins", () => {
    expect(isAllowedOrigin("https://evil.example", tunnel, "development")).toBe(
      false,
    );
  });
});
