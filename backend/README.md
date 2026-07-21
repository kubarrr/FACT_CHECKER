# Backend – Cloudflare Worker (proxy do Gemini)

Serwer trzyma Twój klucz API po stronie serwera. Użytkownicy PWA nie potrzebują
własnego klucza. Darmowy plan Cloudflare Workers wystarcza na start.

## Co robi

- `POST /` z `{ answerText, userQuestion?, numQuestions?, mode?, profile?, language? }` → JSON z oceną i pytaniami.
  - `mode`: `factcheck` (domyślnie), `story` (My Career), `lingo` (Linglerno).
- `GET /health` → `ok`.
- **Grounding**: dla `factcheck` włącza wyszukiwanie Google (Gemini `google_search`),
  weryfikuje treść w realnych źródłach i zwraca je w polu `sources: [{title, url}]`.
  Sterowane zmienną `GROUNDING` (`on`/`off`).
- CORS włączony (PWA i rozszerzenie mogą wołać z innej domeny).
- Limit wielkości wejścia (8000 znaków).
- Rate limiting **per urządzenie** (nagłówek `X-Device-Id`, fallback na IP): 12/min, 200/dobę —
  **wymaga KV** (poniżej). Bez KV limity są wyłączone.

## Wykorzystanie w rozszerzeniu i PWA

- **Rozszerzenie**: w Opcjach wklej adres serwera w polu „Server URL". Wtedy Fact Checker
  (i My Career / Linglerno) działają na Twoim kluczu z groundingiem. Puste = tryb lokalny.
- **PWA**: wpisz adres w `pwa/config.js` (patrz niżej).

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
