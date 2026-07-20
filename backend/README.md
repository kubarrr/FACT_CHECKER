# Backend – Cloudflare Worker (proxy do Gemini)

Serwer trzyma Twój klucz API po stronie serwera. Użytkownicy PWA nie potrzebują
własnego klucza. Darmowy plan Cloudflare Workers wystarcza na start.

## Co robi

- `POST /` z `{ answerText, userQuestion?, numQuestions? }` → zwraca JSON z oceną i pytaniami.
- `GET /health` → `ok`.
- CORS włączony (PWA może wołać z innej domeny).
- Limit wielkości wejścia (8000 znaków).
- Rate limiting per IP (12/min, 200/dobę) — **wymaga KV** (poniżej). Bez KV limity są wyłączone.

## Wdrożenie (krok po kroku)

1. Zainstaluj Node.js. W folderze `backend/`:

```bash
npm install -g wrangler   # lub: npx wrangler ...
npx wrangler login        # logowanie do konta Cloudflare (darmowe)
```

2. Ustaw klucz API Gemini jako **sekret** (nie w pliku!):

```bash
npx wrangler secret put GEMINI_API_KEY
# wklej klucz z https://aistudio.google.com/app/apikey
```

3. (Zalecane) Włącz limity — utwórz KV i wpisz id do `wrangler.toml`:

```bash
npx wrangler kv namespace create RATE_LIMIT
# skopiuj wygenerowane id, odkomentuj sekcję [[kv_namespaces]] w wrangler.toml i wklej id
```

4. Wdróż:

```bash
npx wrangler deploy
```

Dostaniesz adres typu `https://fact-checker.twoja-nazwa.workers.dev`.

5. Sprawdź:

```bash
curl https://fact-checker.twoja-nazwa.workers.dev/health   # -> ok
```

## Podłączenie PWA

W pliku `pwa/config.js` wklej adres Workera:

```js
export const BACKEND_URL = "https://fact-checker.twoja-nazwa.workers.dev";
```

Od teraz PWA domyślnie używa serwera — użytkownik nic nie wkleja.

## Koszty i limity (na start za darmo)

- Cloudflare Workers: darmowy plan ~100 000 żądań/dobę.
- Gemini API: darmowy tier ma własne limity RPM/dobę; przy dużym ruchu włącz płatny
  tier w Google i/lub obniż limity `RL_PER_MINUTE` / `RL_PER_DAY` w `worker.js`.

## Przejście na płatne (później)

Ten worker to fundament. Aby dodać płatności:
1. Dodaj logowanie (np. token/konto) i sprawdzanie planu użytkownika.
2. Podłącz Stripe (webhook ustawia flagę „pro" w KV/bazie).
3. Dla „pro" użyj lepszego modelu (`GEMINI_MODEL` = np. `gemini-2.5-pro`) i wyższych limitów.
