import { NextResponse } from "next/server";
import { z } from "zod";
import { coachMessages, offlineCoachReply, withServerXp } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  targetLanguage: z.string().regex(/^[a-z]{2}$/).default("de"),
  context: z.string().max(2000).optional(),
});

const modelSchema = z.object({
  correction: z.string().nullable(),
  explanation: z.string(),
  reply: z.string(),
  suggested_replies: z.array(z.string()).max(4),
});

const UPSTREAM_TIMEOUT_MS = 15_000;

function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
    }
    const { message, targetLanguage, context } = parsed.data;

    if (!supabaseConfigured()) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Coach ist nicht konfiguriert." }, { status: 503 });
      }
      return NextResponse.json(offlineCoachReply(message), { headers: { "X-Coach-Mode": "offline-fallback" } });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Bitte melde dich an, um den Coach zu nutzen." }, { status: 401 });
    }

    const { data: quotaRows, error: quotaError } = await supabase.rpc("check_and_increment_ai_quota", {
      p_user_id: user.id,
    });
    if (quotaError) {
      return NextResponse.json({ error: "Quota-Prüfung fehlgeschlagen." }, { status: 500 });
    }
    const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    if (!quota?.allowed) {
      return NextResponse.json({ error: "Tageslimit für den KI-Coach erreicht. Versuche es morgen wieder." }, { status: 429 });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key || key === "mock_key") {
      return NextResponse.json(offlineCoachReply(message), { headers: { "X-Coach-Mode": "offline-fallback" } });
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
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json({ error: "Der Coach antwortet gerade nicht rechtzeitig." }, { status: 504 });
      }
      return NextResponse.json({ error: "Der Coach ist kurz nicht erreichbar." }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      return NextResponse.json({ error: "Der Coach ist kurz nicht erreichbar." }, { status: 502 });
    }

    const payload = (await upstream.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    let parsedContent: unknown;
    try {
      parsedContent = typeof content === "string" ? JSON.parse(content.slice(0, 8000)) : content;
    } catch {
      return NextResponse.json({ error: "Ungültige Coach-Antwort." }, { status: 502 });
    }
    const result = modelSchema.safeParse(parsedContent);
    if (!result.success) {
      return NextResponse.json({ error: "Ungültige Coach-Antwort." }, { status: 502 });
    }
    return NextResponse.json(withServerXp(result.data));
  } catch {
    return NextResponse.json({ error: "Coach-Anfrage fehlgeschlagen." }, { status: 500 });
  }
}
