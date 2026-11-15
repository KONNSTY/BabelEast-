# linguaflow

Marktreifer Sprachlern-App-Kern mit Next.js, Supabase, Offline-fähigem Client-State und lokalem Voice-Fallback.

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Für echte Konten die Supabase-Variablen eintragen und die Dateien in `supabase/migrations` der Reihe nach im Supabase SQL Editor ausführen. `NEXT_PUBLIC_APP_URL` muss in Produktion die öffentliche https-Origin sein. Ohne Supabase bleibt der Fortschritt auf diesem Gerät. Der AI-Coach antwortet in der Entwicklung ohne Schlüssel lokal und nutzt mit `OPENROUTER_API_KEY` den konfigurierten Provider. In Produktion braucht der Coach Supabase, damit das Tageslimit gilt.

## Qualitäts-Gates

```bash
npm run lint
npm run test
npm run build
```

Vor Produktion: `.env.local` niemals committen, Supabase-RLS prüfen, Auth-Redirects konfigurieren, Error Monitoring aktivieren, die Seed-Inhalte durch Muttersprachler abnehmen und E2E-Tests auf iOS Safari, Android Chrome und Desktop Chrome ausführen.
