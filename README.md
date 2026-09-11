# linguaflow

Marktreifer Sprachlern-App-Kern mit Next.js, Supabase, Offline-fähigem Client-State und lokalem Voice-Fallback.

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Für echte Konten die Supabase-Variablen eintragen und `supabase/migrations/001_core.sql` im Supabase SQL Editor ausführen. Der AI-Coach arbeitet ohne Schlüssel mit einer sicheren lokalen Antwort und nutzt mit `OPENROUTER_API_KEY` den konfigurierten Provider.

## Qualitäts-Gates

```bash
npm run lint
npm run test
npm run build
```

Vor Produktion: `.env.local` niemals committen, Supabase-RLS prüfen, Auth-Redirects konfigurieren, Error Monitoring aktivieren, die Seed-Inhalte durch Muttersprachler abnehmen und E2E-Tests auf iOS Safari, Android Chrome und Desktop Chrome ausführen.
