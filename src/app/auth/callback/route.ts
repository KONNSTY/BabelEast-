import { NextResponse } from "next/server";
import { appRedirectUrl } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

function redirect(request: Request, path: string) {
  const response = NextResponse.redirect(appRedirectUrl(request, path, process.env.NEXT_PUBLIC_APP_URL));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");
  if (providerError || !code || code.length > 2048) return redirect(request, "/login?error=auth");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return redirect(request, "/login?error=auth");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect(request, "/login?error=auth");
  } catch {
    return redirect(request, "/login?error=auth");
  }
  return redirect(request, "/");
}
