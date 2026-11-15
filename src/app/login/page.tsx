"use client";

import { type FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { LoadingState } from "@/components/states/LoadingState";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(params.get("error") === "auth" ? "Der Login-Link war ungültig oder abgelaufen." : "");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMessage("Prüfe deine E-Mails — dein sicherer Login-Link ist unterwegs.");
    } catch (error) {
      const unconfigured = error instanceof Error && error.message === "Supabase ist nicht konfiguriert.";
      setMessage(
        unconfigured
          ? "Login ist noch nicht konfiguriert. Trage zuerst deine Supabase-Variablen ein."
          : "Der Login-Link konnte gerade nicht gesendet werden. Versuch es später erneut.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl">
      <p className="mb-2 font-black text-brand">linguaflow</p>
      <h1 className="mb-2 text-3xl font-black">Willkommen zurück.</h1>
      <p className="mb-8 text-slate-500">Login ohne Passwort. Sicher und unkompliziert.</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-bold text-slate-600" htmlFor="email">
          E-Mail
          <input
            id="email"
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-slate-200 p-4 outline-none focus:border-sky-400"
            placeholder="du@beispiel.de"
          />
        </label>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sende …" : "Login-Link senden"}
        </Button>
      </form>
      {message && (
        <p role="status" className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm font-medium text-sky-800">
          {message}
        </p>
      )}
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
      <Suspense fallback={<LoadingState label="Login wird geladen …" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
