# Fact Checker AI – wersja mobilna (PWA)

Darmowa aplikacja webowa (PWA) na telefon i komputer. Użytkownik wkleja lub
**udostępnia** treść (news, odpowiedź AI) i dostaje ocenę wiarygodności + pytania.

Tryby (darmowe):

- **Gemini (własny klucz / BYOK)** – najlepsza jakość. Użytkownik wkleja własny,
  darmowy klucz z [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
  Klucz jest zapisywany tylko na jego urządzeniu (localStorage).
- **Offline** – bez klucza, ogólne pytania kontrolne (heurystyka).

## Jak opublikować (darmowo, HTTPS wymagany)

PWA musi być serwowana przez HTTPS. Wybierz jedną z darmowych opcji i wgraj
zawartość folderu `pwa/`:

### Opcja A: Cloudflare Pages / Netlify / Vercel (przeciągnij i upuść)

1. Załóż darmowe konto (np. Cloudflare Pages).
2. Utwórz nowy projekt → „Deploy manually" / drag & drop.
3. Przeciągnij **całą zawartość folderu `pwa/`** (nie sam folder).
4. Dostaniesz adres typu `https://twoja-nazwa.pages.dev`.

### Opcja B: GitHub Pages

1. Wrzuć zawartość `pwa/` do repozytorium.
2. Settings → Pages → wskaż branch/katalog.
3. Adres: `https://uzytkownik.github.io/repo/`.

Lokalny test (na komputerze):

```bash
cd pwa
python -m http.server 8080
# otwórz http://localhost:8080
```

## Jak użytkownik „pobiera" aplikację (bez sklepu)

To PWA – nie ma sklepu. Użytkownik dostaje **jeden link** i instaluje w 5 s:

**Android (Chrome):**
1. Otwiera link.
2. Pojawi się pasek „Zainstaluj aplikację" albo menu ⋮ → **„Dodaj do ekranu głównego"**.
3. Ikona pojawia się jak zwykła apka; działa na pełnym ekranie i offline (powłoka).

**iPhone (Safari):**
1. Otwiera link w Safari.
2. Przycisk **Udostępnij** → **„Dodaj do ekranu głównego"**.

**Komputer (Chrome/Edge):**
1. Ikona instalacji w pasku adresu → **Zainstaluj**.

## Udostępnianie treści z innych aplikacji (Android)

Po zainstalowaniu aplikacja pojawia się w systemowym menu **Udostępnij**.
Użytkownik zaznacza tekst w przeglądarce/apce → Udostępnij → **Fact Checker AI**,
a analiza rusza automatycznie.

## Ścieżka do wersji płatnej (później)

Gdy zechcesz model płatny/lepszy bez klucza użytkownika: podmieniasz `gemini.js`
na wywołanie własnego backendu (np. Cloudflare Worker z Twoim kluczem + limity +
Stripe). Reszta UI zostaje bez zmian.
