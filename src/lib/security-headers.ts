type HeaderEnv = {
  nodeEnv?: string;
  supabaseUrl?: string;
};

function connectSources(supabaseUrl: string | undefined): string {
  if (!supabaseUrl) return "";
  try {
    const url = new URL(supabaseUrl);
    if (url.username || url.password) return "";
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return "";
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return ` ${url.origin} ${wsProtocol}//${url.host}`;
  } catch {
    return "";
  }
}

export function contentSecurityPolicy(env: HeaderEnv): string {
  const isProd = env.nodeEnv === "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${connectSources(env.supabaseUrl)}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function securityHeaders(env: HeaderEnv): { key: string; value: string }[] {
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];
  if (env.nodeEnv === "production") {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  }
  return headers;
}
