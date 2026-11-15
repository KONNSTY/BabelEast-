export function supabaseCookieOptions() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secure = appUrl ? appUrl.startsWith("https://") : process.env.NODE_ENV === "production";
  return { path: "/", sameSite: "lax" as const, secure };
}
