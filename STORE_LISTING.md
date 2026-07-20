# Chrome Web Store — Listing Content (Fact Checker AI)

Copy/paste these fields into the Chrome Web Store Developer Dashboard.

## Name
Fact Checker AI

## Short description (max 132 chars)
Assess the credibility of AI answers & news. Auto-detects language and suggests critical verification questions.

## Category
Productivity

## Language
English (with in-app UI localized to EN/PL/ES/DE/FR)

## Detailed description

Fact Checker AI helps you think critically about what you read online.

After an AI chatbot replies (ChatGPT, Gemini, Claude) — or on any news article or web page — it
assesses the content's credibility and suggests smart questions to verify it.

WHAT IT DOES
• Credibility assessment: labels content as fact / opinion / clickbait / mixed and shows a
  disinformation risk level (low / medium / high) with a one-line reason.
• Smart, adaptive questions:
   – For risky or sensational content: 2 sharp verification questions (sources, exaggeration,
     author's motives, manipulation).
   – For solid, factual content (e.g. sports results): deeper "explore" questions to learn more.
• Works everywhere: verify a chat answer, a selected snippet, or a whole article. One click sends
  a question to Gemini for a deeper look.

MULTILINGUAL
The analysis automatically detects the language of the content and answers in that same language.
The interface is localized (English, Polish, Spanish, German, French; default English).

THREE WAYS TO RUN — YOU CHOOSE
• On-device (Gemini Nano): free and private — the text never leaves your browser (requires
  Chrome 138+ and capable hardware).
• Google Gemini / OpenAI: use your own API key for the highest quality across all languages.
• Offline mode: rule-based questions with no model and no network.

PRIVACY FIRST
We have no servers and never receive your data. On-device and offline modes keep everything local.
With Gemini/OpenAI, text is sent directly from your browser to the provider using your own API key.
Your key is stored locally in your browser.

Fact Checker AI does not tell you what to think — it helps you ask the right questions.

## Permission justifications (for review)

- storage — Save user settings and the user's own API key locally.
- activeTab, scripting — Read the current page's content only when the user triggers a check, to
  analyze it.
- contextMenus — Provide right-click "verify selection / page" actions.
- offscreen — Run Chrome's built-in on-device model (Prompt API), which cannot run in an MV3
  service worker.
- host permissions (<all_urls>) — The verification panel must be able to work on any site the
  user visits; page text is accessed only on user action (or on supported AI chat sites if the
  user enables auto-analysis).

## Single purpose (for review)
A single purpose: assess the credibility of on-screen content (AI answers, news, articles) and
suggest critical verification questions.

## Data usage disclosures (Dashboard toggles)
- Does the item collect user data? The extension itself does not collect or transmit data to the
  developer. Content is processed on-device or sent directly to the user's chosen AI provider.
- Not sold to third parties. Not used for purposes unrelated to the single purpose. Not used for
  creditworthiness/lending.

## Privacy policy URL
(Host PRIVACY.md publicly — e.g. a GitHub Pages / repo URL — and paste that link here.)

## Assets to prepare before submitting
- Store icon: 128×128 (icons/icon-128.png) ✓
- At least 1 screenshot 1280×800 or 640×400 (capture the panel showing an assessment + questions).
- Optional: small promo tile 440×280.
