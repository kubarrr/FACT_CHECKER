# Privacy Policy — Fact Checker AI

_Last updated: 2026-07-22_

Fact Checker AI ("the extension") helps you assess the credibility of what you read, turn it into
short lessons, and find the comments worth your time. This policy explains what data the extension
handles and where it goes.

## Summary

- Your **learning data** — saved lessons, vocabulary, review schedule, progress and profile — stays
  **in your browser**. It is never uploaded.
- The **text you ask the extension to analyse** is sent to whichever engine you selected. That can
  be your own device, an AI provider under your own API key, or a **cloud server operated by the
  extension's developer** if you configure one.
- Your settings and API key are stored locally in your browser profile.

## Where the analysed text goes

When you trigger the extension it reads the text you pointed it at — the latest AI chat answer, the
article or page content, your selected text, or the comments currently visible on the page — and
processes it. Where that text travels depends on the engine set in Options:

- **On-device (Gemini Nano):** processed locally by Chrome's built-in model. **Nothing leaves your
  device.**
- **Google Gemini or OpenAI (your API key):** sent directly from your browser to that provider,
  under [Google's Privacy Policy](https://policies.google.com/privacy) /
  [Gemini API terms](https://ai.google.dev/gemini-api/terms) or
  [OpenAI's Privacy Policy](https://openai.com/policies/privacy-policy).
- **Cloud server (the "Server URL" setting):** sent to a server operated by the extension's
  developer, which forwards it to Google Gemini using the developer's own API key and returns the
  result. **In this mode the developer's server does receive the analysed text.** It is used only
  to produce your result. The server does not write the text to a database and does not keep it
  after the request completes. Leave "Server URL" empty if you do not want this.
- **Offline mode:** questions come from built-in rules. Nothing leaves your device.

### Rate limiting on the cloud server

To stop the developer's API key from being abused, the cloud server counts requests per IP address
for one minute and one day. It stores only these counters, keyed by IP, with short expiry. No
request content is stored alongside them.

### Comments

The "worth reading" feature reads comments that are **currently visible** on the page and sends
their text to the engine you selected, so it can pick out the substantive ones. Notes:

- Comments are written by other people. Choose this feature deliberately, as you would when pasting
  someone else's text into any AI tool.
- The extension judges **individual comments, never their authors**. It does not build profiles, does
  not track anyone across pages, and stores nothing about commenters — not even for the current
  page once you close the panel.
- Only what is on screen is read. The extension does not scroll or crawl to gather more.

### Occupation lookup

If you pick an occupation in the Library, the extension queries the European Commission's public
[ESCO](https://esco.ec.europa.eu/) API to fetch that occupation and its skills. Only your search
term and the chosen occupation identifier are sent. No personal data, and no information about what
you read, is included. The result is cached locally afterwards.

## What is stored, and where

**In your browser only (`chrome.storage.local`), never uploaded:**

- Saved lessons, including the page title and URL they came from
- Vocabulary with its spaced-repetition schedule
- Skill tags derived from what you read, and your chosen occupation
- XP, streak, badges and counters

You can export all of it as JSON, or clear it, from the Library.

**In your browser profile (`chrome.storage.sync`, may sync across your signed-in Chrome
instances):** your settings, your profile fields (role, industry, goals, languages, level) and your
API key. The API key is sent only to the provider you selected.

**In memory only:** a short-lived cache of recent results, discarded when the browser closes.

## Permissions and why they are used

- `storage` — to save your settings, profile and learning data locally.
- `activeTab` / `scripting` — to read the current page when you trigger a check.
- `contextMenus` — for the right-click "verify selection / page" options.
- `offscreen` — to run Chrome's on-device model, which cannot run in the background service worker.
- `host_permissions: <all_urls>` — so the panel works on any site you choose to use it on, and so
  the Library can reach the ESCO API. Page content is read only when you trigger the extension, or
  automatically on supported AI chat sites if you switch that on.

## Data sharing

Your data is not sold, rented or shared. External transmission happens only in the cases named
above: to the AI provider you configured, to the developer's cloud server if you set one, and to
the ESCO API when you look up an occupation.

## Children

The extension is not directed at children under 13.

## Changes

This policy may be updated; material changes appear here with a new "Last updated" date.

## Contact

For questions about this policy, contact: <your-email@example.com>
