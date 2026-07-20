# Privacy Policy — Fact Checker AI

_Last updated: 2026-07-20_

Fact Checker AI ("the extension") helps you assess the credibility of AI chat answers and web
content by generating critical verification questions. This policy explains what data the
extension handles and how.

## Summary

- The extension does **not** have its own servers. It does not collect, store, or transmit your
  data to us.
- Depending on the engine you choose, the analyzed text is either processed **entirely on your
  device** or sent **directly to the AI provider you configured** (Google Gemini or OpenAI).
- Your settings (including your API key) are stored **locally in your browser**.

## What data is processed

When you click the extension button (or use the context menu), the extension reads the text you
asked it to check — the latest AI chat answer, the article/page content, or your selected text —
and processes it to generate the credibility assessment and questions.

Depending on the selected provider:

- **On-device (Gemini Nano):** the text is processed locally by Chrome's built-in model. **No
  data leaves your device.**
- **Google Gemini (your API key):** the text is sent directly from your browser to Google's
  Generative Language API. It is subject to
  [Google's Privacy Policy](https://policies.google.com/privacy) and the
  [Gemini API terms](https://ai.google.dev/gemini-api/terms).
- **OpenAI (your API key):** the text is sent directly from your browser to OpenAI's API. It is
  subject to [OpenAI's Privacy Policy](https://openai.com/policies/privacy-policy).
- **Offline mode:** questions are generated locally from built-in rules. No data leaves your
  device.

We (the extension developer) never receive this text. There is no intermediary server operated by
us.

## Storage

- **Settings** (provider choice, model name, toggles, number of questions) and your **API key**
  are stored using `chrome.storage.sync`, which keeps them in your browser profile (and may sync
  across your signed-in Chrome instances). The API key is sent only to the provider you selected.
- A small **in-memory cache** of recent results exists only while the extension is running and is
  never persisted or transmitted.

## Permissions and why they are used

- `storage` — to save your settings and API key locally.
- `activeTab` / `scripting` — to read the content of the current page when you trigger a check.
- `contextMenus` — to add the right-click "verify selection / page" options.
- `offscreen` — to run Chrome's on-device model (the Prompt API cannot run in the background
  service worker).
- `host_permissions: <all_urls>` — so the on-page panel and verification can work on any site
  where you choose to use it. Page content is read only when you explicitly trigger the extension
  (or, if you enable it, automatically on supported AI chat sites).

## Data sharing

We do not sell, rent, or share your data. The only external transmission that can occur is the
direct request from your browser to the AI provider you configured (Google or OpenAI), using your
own API key.

## Children

The extension is not directed at children under 13.

## Changes

We may update this policy; material changes will be reflected here with a new "Last updated" date.

## Contact

For questions about this policy, contact: <your-email@example.com>
