const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function sameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function configuredAppOrigin(appUrl: string | undefined): string | null {
  if (!appUrl) return null;
  try {
    const url = new URL(appUrl);
    const local = LOCAL_HOSTS.has(url.hostname);
    if (url.username || url.password) return null;
    if (url.protocol === "https:" || (url.protocol === "http:" && local)) return url.origin;
    return null;
  } catch {
    return null;
  }
}

export function appRedirectUrl(request: Request, path: string, appUrl: string | undefined): URL {
  const safePath = path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !path.includes("://") ? path : "/";
  const requestUrl = new URL(request.url);
  const origin = configuredAppOrigin(appUrl) ?? requestUrl.origin;
  const target = new URL(safePath, origin);
  if (target.origin !== origin) return new URL("/", origin);
  return target;
}

export function publicReferer(appUrl: string | undefined): string {
  return configuredAppOrigin(appUrl) ?? "http://localhost:3000";
}
