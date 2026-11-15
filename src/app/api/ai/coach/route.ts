import { NextResponse } from "next/server";
import { coachMessages, coachMode, coachModelSchema, offlineCoachReply, readCoachRequest, withServerXp } from "@/lib/coach";
import { publicReferer } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UPSTREAM_TIMEOUT_MS = 15_000;
const NO_STORE = { "Cache-Control": "no-store" };

function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

async function releaseCoachQuota(userId: string) {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    await admin.rpc("refund_ai_quota", { p_user_id: userId });
  } catch {
    // A missed refund must not replace the upstream error the learner sees.
  }
}

export async function POST(request: Request) {
  try {
    const read = await readCoachRequest(request);
    if (!read.ok) return json({ error: read.error }, read.status);
    const { message, targetLanguage, context } = read.data;

    const mode = coachMode({ supabaseConfigured: supabaseConfigured(), nodeEnv: process.env.NODE_ENV });
    if (mode === "unavailable") return json({ error: "Coach ist nicht konfiguriert." }, 503);
    if (mode === "offline") {
      return json(offlineCoachReply(message), 200, { "X-Coach-Mode": "offline-fallback" });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Bitte melde dich an, um den Coach zu nutzen." }, 401);

    const { data: quotaRows, error: quotaError } = await supabase.rpc("check_and_increment_ai_quota", {
      p_user_id: user.id,
    });
    if (quotaError) return json({ error: "Quota-Prüfung fehlgeschlagen." }, 500);
    const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    if (!quota?.allowed) {
      return json({ error: "Tageslimit für den KI-Coach erreicht. Versuche es morgen wieder." }, 429);
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key || key === "mock_key") {
      return json(offlineCoachReply(message), 200, { "X-Coach-Mode": "offline-fallback" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": publicReferer(process.env.NEXT_PUBLIC_APP_URL),
          "X-Title": "linguaflow",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
          temperature: 0.3,
          max_tokens: 450,
          response_format: { type: "json_object" },
          messages: coachMessages({ message, targetLanguage, context }),
        }),
      });
    } catch (error) {
      await releaseCoachQuota(user.id);
      if (error instanceof Error && error.name === "AbortError") {
        return json({ error: "Der Coach antwortet gerade nicht rechtzeitig." }, 504);
      }
      return json({ error: "Der Coach ist kurz nicht erreichbar." }, 502);
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      await releaseCoachQuota(user.id);
      return json({ error: "Der Coach ist kurz nicht erreichbar." }, 502);
    }

    const payload = (await upstream.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    let parsedContent: unknown;
    try {
      parsedContent = typeof content === "string" ? JSON.parse(content.slice(0, 8000)) : content;
    } catch {
      return json({ error: "Ungültige Coach-Antwort." }, 502);
    }
    const result = coachModelSchema.safeParse(parsedContent);
    if (!result.success) return json({ error: "Ungültige Coach-Antwort." }, 502);
    return json(withServerXp(result.data));
  } catch {
    return json({ error: "Coach-Anfrage fehlgeschlagen." }, 500);
  }
}
