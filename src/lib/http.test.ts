import { describe, expect, it } from "vitest";
import { appRedirectUrl, configuredAppOrigin, sameOriginRequest } from "./http";

describe("request origins", () => {
  it("accepts only the configured https or local origin", () => {
    expect(configuredAppOrigin("https://app.example")).toBe("https://app.example");
    expect(configuredAppOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(configuredAppOrigin("http://evil.example")).toBeNull();
    expect(configuredAppOrigin("not a url")).toBeNull();
  });

  it("keeps auth redirects on the configured origin", () => {
    const request = new Request("https://evil.example/auth/callback?code=abc");
    const target = appRedirectUrl(request, "/", "https://app.example");
    expect(target.href).toBe("https://app.example/");
    expect(appRedirectUrl(request, "//evil.example", "https://app.example").href).toBe("https://app.example/");
    expect(appRedirectUrl(request, "/login?error=auth", "https://app.example").href).toBe("https://app.example/login?error=auth");
  });

  it("compares the browser origin with the request origin", () => {
    expect(sameOriginRequest(new Request("https://app.example/api", { headers: { origin: "https://app.example" } }))).toBe(true);
    expect(sameOriginRequest(new Request("https://app.example/api", { headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(sameOriginRequest(new Request("https://app.example/api"))).toBe(true);
  });
});
