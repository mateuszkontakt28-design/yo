# YT Shorts Monetization Tracker

Śledzenie postępu monetyzacji kanałów YouTube Shorts. Dla każdego kanału ustawiasz
progi (suby + wyświetlenia) i datę docelową; **widget na ekranie głównym iPhone'a**
pokazuje ile zostało dni i % ukończenia, a **dashboard** służy do zarządzania kanałami
i wpisywania liczb.

## Kontekst monetyzacji

- **Shorts:** 1000 subów **+** 10 mln wyświetleń Shorts w oknie **90 dni**. Oba progi muszą być spełnione — dlatego `completion_pct = min(pct_subs, pct_views)` (słabszy próg decyduje).
- **Suby** można ciągnąć automatycznie z YouTube Data API v3 (`channels.list?part=statistics`) — w v1 **wyłączone**, wpisujesz ręcznie. Dokleja się przez dodanie `YOUTUBE_API_KEY`.
- **Rolling 90-day Shorts views** nie istnieje w publicznym API — **wpisujesz ręcznie** z YT Studio. Karta pokazuje „views zaktualizowane: X temu”.
- Progi są konfigurowalne per kanał (np. long-form: 4000h zamiast 10 mln — ustaw `view_goal` na swoją miarę).

## Stack

| Warstwa | Technologia | Hosting |
|---|---|---|
| Baza | Postgres | Supabase |
| API | TypeScript, funkcje serverless (`/api`) | Vercel |
| Dashboard | React + Vite + TS | Vercel (same-origin z API) |
| Widget | `widget.js` | Scriptable (iOS) |

## Struktura repo

```
/api            funkcje serverless (TS) + logika liczenia
  _lib/         supabase, auth/CORS, compute, walidacja, typy
  channels/     GET+POST /channels, PUT+DELETE /channels/[id], /[id]/refresh-subs
  widget.ts     GET /widget (publiczny, chroniony ?key=)
/dashboard      aplikacja Vite React TS (PWA)
schema.sql      schema Postgres do Supabase
vercel.json     build dashboardu + routing SPA (z pominięciem /api)
.env.example    zmienne backendu
widget.js       widget Scriptable
```

---

## Setup krok po kroku

### 1. Baza (Supabase)

1. Załóż projekt na [supabase.com](https://supabase.com).
2. **SQL Editor** → wklej całą zawartość [`schema.sql`](./schema.sql) → **Run**.
3. **Project Settings → API** — zanotuj:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret (nie `anon`!) → `SUPABASE_SERVICE_KEY`

> RLS jest włączone bez polityk, więc klucz `anon` nic nie widzi. Cały dostęp idzie przez `service_role` po stronie serwera — **nigdy nie wystawiaj go w przeglądarce**.

### 2. Zmienne środowiskowe

Skopiuj `.env.example` → `.env` (lokalnie) i/lub ustaw w Vercel:

| Zmienna | Opis |
|---|---|
| `SUPABASE_URL` | z Supabase |
| `SUPABASE_SERVICE_KEY` | `service_role` z Supabase |
| `API_TOKEN` | token do CRUD API (`openssl rand -hex 24`) |
| `WIDGET_KEY` | osobny klucz dla widgetu (`openssl rand -hex 24`) |
| `YOUTUBE_API_KEY` | *(opcjonalnie, później)* aktywuje `/refresh-subs` |

### 3. Deploy na Vercel

1. Wypchnij repo na GitHub i zaimportuj do Vercel (**Add New → Project**).
2. Ustawienia zostaw domyślne — `vercel.json` sam:
   - buduje dashboard (`dashboard/dist`),
   - serwuje funkcje z `/api`,
   - kieruje pozostałe ścieżki do SPA (z pominięciem `/api`).
3. W **Settings → Environment Variables** dodaj wszystkie zmienne z kroku 2.
   - Dodaj też `VITE_API_BASE=/api` oraz `VITE_API_TOKEN=<to samo co API_TOKEN>` (dashboard woła API tym tokenem).
4. **Deploy.** Dostajesz `https://twoj-projekt.vercel.app`.

> ⚠️ `VITE_API_TOKEN` trafia do bundla przeglądarki (jest widoczny w devtools). To świadomy kompromis — dashboard stawiasz u siebie. Jeśli chcesz twardszej ochrony, postaw dashboard za osobnym logowaniem (np. Vercel Password Protection / Cloudflare Access).

### 4. Dashboard lokalnie (opcjonalnie)

```bash
# Terminal 1 — backend + funkcje /api (Vercel CLI)
npm i -g vercel
vercel dev            # http://localhost:3000  (użyje .env)

# Terminal 2 — dashboard z hot-reload
cd dashboard
cp .env.example .env.local     # ustaw VITE_API_BASE=/api
npm install
npm run dev           # http://localhost:5173  (proxuje /api -> :3000)
```

Na Macu otwierasz w przeglądarce, na iPhonie działa responsywnie. Możesz dodać do ekranu głównego (**Udostępnij → Do ekranu początkowego**) — PWA z manifestem.

### 5. Widget w Scriptable

1. Zainstaluj **Scriptable** (App Store, darmowa).
2. Scriptable → **+** → wklej [`widget.js`](./widget.js) → nazwij np. „YT Tracker”.
3. Na górze pliku uzupełnij:
   ```js
   const API = "https://twoj-projekt.vercel.app/api/widget";
   const KEY = "wartość WIDGET_KEY z backendu";
   const CHANNEL = "next"; // domyślnie
   ```
4. Ekran główny → przytrzymaj → **+** → **Scriptable** → wybierz **Small** albo **Medium** → dodaj.
5. Przytrzymaj widget → **Edytuj widget**:
   - **Script** = YT Tracker
   - **Parameter** = `id` kanału (np. `3`) **albo** `next` (rotacja po kanałach co minutę)
6. Możesz dodać kilka widgetów z różnymi `Parameter`.

Widget odświeża się co ~30 min, przy braku sieci pokazuje ostatnie dane (albo „brak połączenia”), a tło zmienia kolor wg tempa: 🟢 na czas / 🟠 w tyle / 🔴 zagrożone.

---

## API (skrót)

Wszystkie CRUD wymagają nagłówka `Authorization: Bearer <API_TOKEN>`.

| Metoda | Ścieżka | Opis |
|---|---|---|
| `GET` | `/api/channels` | lista kanałów z policzonymi polami |
| `POST` | `/api/channels` | nowy kanał |
| `PUT` | `/api/channels/{id}` | edycja (w tym ręczny `current_views` → stempluje `views_updated_at`) |
| `DELETE` | `/api/channels/{id}` | usuwa |
| `POST` | `/api/channels/{id}/refresh-subs` | suby z Data API (501 dopóki brak `YOUTUBE_API_KEY`) |
| `GET` | `/api/widget?key=…&channel={id\|next}` | publiczny, odchudzony JSON dla widgetu |

**Policzone pola** (liczone po stronie API): `days_left`, `days_total`, `pct_subs`,
`pct_views`, `completion_pct` (= min z obu), `elapsed_pct`, `pace` (`green|orange|red`), `overdue`.

**Reguła pace:** `green` gdy postęp ≥ upływ czasu; `orange` gdy w tyle o ≤15 pp; `red`
gdy dalej w tyle lub po terminie i niedokończone. Cel osiągnięty (100%) = zawsze `green`.

Przykład odpowiedzi `/api/widget`:

```json
{ "name": "Bet You Missed", "days_left": 42, "completion_pct": 41,
  "pct_subs": 73, "pct_views": 41, "pace": "orange" }
```

## Włączenie auto-subów (później)

1. Google Cloud → włącz **YouTube Data API v3** → utwórz **API key**.
2. Dodaj `YOUTUBE_API_KEY` do zmiennych Vercela.
3. Uzupełnij `youtube_channel_id` (format `UC…`) przy każdym kanale.
4. Przycisk **Odśwież suby** zacznie działać (endpoint `/refresh-subs`).
