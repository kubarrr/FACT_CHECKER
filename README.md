# 🔍 Fact Checker AI

Rozszerzenie do przeglądarek Chromium (Chrome, Edge, Brave, Opera) w **Manifest V3**.
Po odpowiedzi czata AI (ChatGPT, Gemini, Claude) ocenia **wiarygodność treści** (fakt / opinia /
clickbait, poziom ryzyka dezinformacji) i podsuwa **dopasowane pytania** – ostre weryfikujące dla
treści ryzykownych, a pogłębiające/ciekawostkowe dla rzetelnych faktów. Działa też na dowolnej
stronie / newsie.

**Wielojęzyczność:** analiza **automatycznie wykrywa język treści i odpowiada w tym samym języku**
(ścieżka modelowa – Gemini/OpenAI/Nano – obsługuje cały świat). Interfejs jest tłumaczony wg języka
przeglądarki (obecnie EN/PL/ES/DE/FR, domyślnie angielski). Tryb offline pokrywa w pełni EN i PL,
dla pozostałych języków używa angielskiego jako uniwersalnego fallbacku.

## Jak to działa

1. Na stronie pojawia się pływający przycisk **🔍 Fact Checker AI** (prawy dolny róg).
2. Po kliknięciu rozszerzenie pobiera ostatnią odpowiedź AI (lub treść strony/zaznaczenie).
3. Treść trafia do wybranego silnika:
   - **Model lokalny (Gemini Nano)** – domyślny, działa w przeglądarce użytkownika, za darmo i prywatnie (Prompt API, Chrome 138+),
   - **Gemini / OpenAI** – Twój klucz API (wyższa jakość),
   - **Tryb ogólny (offline)** – pytania z reguł, bez modelu.
4. W panelu HTML pojawiają się pytania krytyczne z krótkim uzasadnieniem oraz przyciski
   **Kopiuj** i **Zapytaj w Gemini** (kopiuje pytanie + kontekst i otwiera Gemini).

Dodatkowo: menu kontekstowe (PPM) → „Krytyk AI: zweryfikuj zaznaczony tekst / stronę”.

## Instalacja (tryb deweloperski – teraz)

1. Otwórz `chrome://extensions` (lub `edge://extensions`).
2. Włącz **Tryb dewelopera** (prawy górny róg).
3. Kliknij **Wczytaj rozpakowane** i wskaż folder tego projektu (ten z `manifest.json`).
4. Otwórz ustawienia rozszerzenia i wklej klucz API (opcjonalne – bez klucza działa tryb ogólny).

### Klucze API
- **Gemini:** https://aistudio.google.com/app/apikey
- **OpenAI:** https://platform.openai.com/api-keys

## Model lokalny (Gemini Nano) – co warto wiedzieć

Domyślny silnik używa wbudowanego w Chrome **Prompt API** (model Gemini Nano) – bez klucza,
bez serwera, dane nie opuszczają przeglądarki. Ważne:

- Wymaga **Chrome 138+** oraz odpowiedniego sprzętu (ok. 22 GB wolnego dysku; GPU ≥4 GB VRAM
  lub CPU 16 GB RAM + 4 rdzenie; Windows 10/11, macOS 13+, Linux, ChromeOS Chromebook Plus).
- **Pierwsze użycie** pobiera model (kilka GB) – jednorazowo, wymaga sieci bez limitu. Potem offline.
- Prompt API **nie działa w service workerze** MV3 – dlatego inferencja odbywa się w
  **offscreen document** (`src/offscreen/`), a tło (`background.js`) tylko go steruje.
- Oficjalnie wspierane języki to en/ja/es/de/fr – **polski może dawać niższą jakość**.
- Gdy model jest `unavailable`, rozszerzenie automatycznie użyje pytań ogólnych (fallback).

## Ustawienia

- Wybór silnika: **model lokalny (Gemini Nano)** / Gemini API / OpenAI / tryb ogólny (offline).
- Klucz API i model.
- Automatyczna analiza po każdej odpowiedzi czata (domyślnie wyłączona).
- Liczba generowanych pytań (1–7).

## Pakowanie i dystrybucja („żeby samo się instalowało")

Rozszerzeń Chromium **nie da się** zainstalować „samoczynnie" z pliku bez zgody użytkownika –
to celowe ograniczenie bezpieczeństwa. Dostępne drogi dystrybucji:

1. **Chrome Web Store** (zalecane dla użytkowników):
   - Spakuj folder do ZIP: w PowerShell `Compress-Archive -Path * -DestinationPath krytyk-ai.zip`.
   - Wgraj na https://chrome.google.com/webstore/devconsole (jednorazowa opłata dewelopera 5 USD).
   - Po publikacji użytkownik instaluje jednym kliknięciem „Dodaj do Chrome".
2. **Edge Add-ons** – analogicznie, bezpłatnie: https://partner.microsoft.com/dashboard/microsoftedge
3. **Wdrożenie firmowe (auto-install)** – tylko przez polityki (`ExtensionInstallForcelist`)
   na komputerach zarządzanych przez organizację.

## Struktura projektu

```
manifest.json
src/
  background.js          # service worker: wywołania LLM + menu kontekstowe
  shared/
    defaults.js          # ustawienia domyślne + magazyn
    prompt.js            # budowa promptu + tryb heurystyczny + parsowanie JSON
  content/
    content.js           # wykrywanie odpowiedzi + panel UI
    content.css
  offscreen/             # uruchamianie modelu lokalnego (Prompt API / Gemini Nano)
    offscreen.html
    offscreen.js
  popup/                 # szybkie przełączniki
  options/               # pełne ustawienia
```

## Obsługiwane serwisy czatów
- ChatGPT (`chatgpt.com`, `chat.openai.com`)
- Gemini (`gemini.google.com`)
- Claude (`claude.ai`)

Na pozostałych stronach działa tryb weryfikacji artykułu/zaznaczenia.

## Uwagi
- Klucz API trzymany jest lokalnie (`chrome.storage.sync`) i wysyłany wyłącznie do wybranego dostawcy.
- Selektory serwisów AI mogą się zmieniać wraz z aktualizacjami tych stron – w razie potrzeby
  zaktualizuj je w `src/content/content.js` (obiekt `SITES`).
