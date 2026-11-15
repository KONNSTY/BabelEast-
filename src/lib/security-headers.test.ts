import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

describe("security headers", () => {
  it("blocks framing and only allows the configured Supabase origin", () => {
    const policy = contentSecurityPolicy({
      nodeEnv: "production",
      supabaseUrl: "https://example.supabase.co",
    });
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("https://example.supabase.co");
    expect(policy).toContain("wss://example.supabase.co");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy({ nodeEnv: "development" })).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy({ supabaseUrl: "javascript:alert(1)" })).not.toContain("javascript:");
  });

  it("sends HSTS only in production", () => {
    const production = securityHeaders({ nodeEnv: "production" }).map((header) => header.key);
    const development = securityHeaders({ nodeEnv: "development" }).map((header) => header.key);
    expect(production).toContain("Strict-Transport-Security");
    expect(production).toContain("X-Content-Type-Options");
    expect(development).not.toContain("Strict-Transport-Security");
  });
});
