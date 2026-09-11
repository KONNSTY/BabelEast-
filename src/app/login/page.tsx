"use client";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
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
    } catch {
      setMessage("Login ist noch nicht konfiguriert. Trage zuerst deine Supabase-Variablen ein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
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
        {message && <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm font-medium text-sky-800">{message}</p>}
      </section>
    </main>
  );
}
