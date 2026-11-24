# Sachet — Phishing X-ray

> Shows you why a login page looks fake, in plain Nepali or English, before you type your password.

Chrome, Edge and Firefox already block known phishing sites, so Sachet does not compete on the blocklist. It wins on three things they skip:

- **Explanations, not just a warning screen** — "this domain imitates eSewa's official site and its form posts to a different server."
- **Local brands and local language** — Nepali wallets and banks, with verdicts and reasons in natural Nepali (Devanagari and Romanized Nepali scam phrases are detected too).
- **Local-first privacy, open source** — all analysis runs in your browser. No URLs, page text or typed values ever leave the device.

## How it works

**v0.1 — click to X-ray.** Click the toolbar icon on any page. The extension injects a one-shot signal collector into that tab only, runs the analysis engine locally, and shows a verdict in the popup:

| Verdict | Meaning |
|---|---|
| 🔴 Red | Strong evidence of impersonation — do not log in. Exact reasons listed. |
| 🟡 Yellow | Suspicious signals — proceed carefully. |
| 🟢 Green | No warning signs found, on a verified official domain only. |
| ⚪ Gray | Unknown site — no claim made. |

**Never "safe".** Phishing sites can pass checks, so green says "no warning signs found", never "safe".

The trusted verdict lives in the **toolbar badge** (red `!`, yellow `?`, green `✓`), which a malicious page cannot draw over. Any in-page banner is secondary — a page can imitate anything it draws itself.

## What the verdict is based on

**Domain checks (strongest signals)**

- Edit distance and look-alike patterns against official brand domains
- Homoglyph / punycode tricks (look-alike characters from other alphabets, `xn--` labels)
- Brand name in a subdomain or path of an unrelated domain (`esewa.com.something-else.xyz`, `evil.com/esewa`)
- Brand name inside the domain with a wrong ending (`esewa.com`, `khalti-secure.com`)
- Suspicious or very new-feeling TLDs, excessive hyphens or subdomains, no HTTPS

**Page checks**

- Password, OTP or PIN field on a page whose domain isn't an official one for the brand it claims
- Form submitting to a different domain than the page
- Hidden iframes, disabled right-click / paste, heavily obfuscated scripts
- Urgency language in English, Devanagari and Romanized Nepali ("account will be blocked", "खाता बन्द हुनेछ", "kyc update garnus", "तपाईंले पुरस्कार जित्नुभयो")

**Clone detection** (roadmap): form-structure fingerprints and logo image hashes against the real login pages in the brand registry.

**Reputation, local first** (roadmap): downloadable phishing feeds stored locally as a compact filter, so browsing URLs are never sent to a server. Check each feed's license and terms first.

## Architecture

```
Manifest V3, TypeScript, WXT (one codebase: Chrome, Edge, Firefox)
├── src/lib/engine.ts      Pure analysis engine — no browser deps, unit-tested,
│                          reusable in a bot or CLI later
├── src/lib/collect.ts     Self-contained page-signal collector, injected on click
├── src/lib/registry.ts    Brand registry loader (bundled JSON, no network)
├── src/lib/i18n.ts        Popup strings in English + Nepali
├── src/brands/*.json      One JSON file per brand
├── src/entrypoints/popup/ Verdict, reasons, "what was checked", report button
└── src/entrypoints/background.ts  Badge, registry, opt-in local reports
```

## Permissions (kept minimal)

| Permission | Why |
|---|---|
| `activeTab` | X-ray the page the user is looking at, only when they click. |
| `storage` | Language choice + opt-in reports, stored locally. |
| `scripting` | One-shot injection of the signal collector on click. |

v0.1 asks for **no host permissions, no browsing history, no cookies**. v0.2's optional "automatic protection" mode will ask for broader site access only if the user turns it on, with a plain explanation of why.

## Privacy

- All analysis runs in the browser by default.
- No URLs, page text or form contents leave the device.
- Reports to the community feed are opt-in, and strip typed values and query parameters.
- The collector never reads or stores what the user types into fields.
- Open source (MIT), with this honest privacy policy in the README and store listing.

## Brand registry (the community hook)

`src/brands/` holds one JSON file per brand: official domains, name variants in English and Nepali, logo hashes, form fingerprints. Contributors add brands through pull requests, and **each entry needs a source proving the official domains** (the brand's own site or app listing). Do not guess domains — a wrong entry marks the real site as fake or a fake as real. Entries with `"verified": false` are ignored by the engine.

Starter set (verified Nov 2026 — see each file's `source` field):

| Brand | Official domains |
|---|---|
| eSewa | esewa.com.np |
| Khalti | khalti.com |
| Nabil Bank | nabilbank.com, nbank.nabilbank.com |
| Google | google.com, accounts.google.com |
| PayPal | paypal.com |

Copy `src/brands/_template.json` to add a brand. This is the "good first issue" surface.

## Development

```bash
npm install
npm run dev          # Chrome/Edge, with hot reload
npm run dev:firefox  # Firefox
npm run test         # Vitest — engine unit tests
npm run typecheck
npm run build        # .output/chrome-mv3
npm run zip          # store-ready zip
```

> **Note:** package installs are blocked in the sandbox this was written in, so `npm install` and the build have not been run here. The engine itself was verified directly: all 25 checks in `/tmp/check-engine.ts` pass against the real `src/lib/engine.ts` using Node 24's built-in type stripping. Run `npm test` on your own machine for the full Vitest suite.

## Testing

- **Unit tests** (`tests/engine.test.ts`): 10 look-alike domain examples for the starter brands (all expected red), homoglyph/punycode, impersonation, cross-domain forms, no-HTTPS, Nepali urgency phrases (Devanagari + romanized), green on official domains, gray on unknown sites, unverified registry entries ignored.
- **Local fixtures** (`tests/fixtures/`): a fake eSewa login page and a plain shop login page. Clearly labelled as test fixtures — **never host look-alike login pages publicly**, even as demos; they can be mistaken for real phishing pages and get your domain or repo flagged.
- **False positives matter most.** Before launch, run the popup against the login pages of popular legitimate sites. If real sites get warnings, users will uninstall.
- For real-world data, use published phishing URL feeds and analyse them by URL and saved signals — don't browse live phishing sites on your main computer.

## Roadmap

**Two-week MVP** (see plan): repo + popup showing the domain → domain engine with tests → content-signal collection + cross-domain form check → brand registry + first verified entries → scoring, verdict popup, EN/NE text → false-positive testing on legitimate logins → icons, screenshots, demo video, store listing → submit to Chrome Web Store + Firefox Add-ons, publish repo.

**Eight weeks after that:** local phishing-feed filter + update mechanism; clone fingerprints and logo matching; optional automatic mode + warning interstitial for red sites; "Report this page" flow and a public list of confirmed Nepali scam domains; a "why this verdict" view and a test report showing detection and false-positive rates; link the engine to the wallet scam-detector bot so both share the same brand registry.

## Honest risks

- **False alarms and misses.** Phishers adapt; detection is one layer of defence, and the UI says so.
- **Registry accuracy.** Wrong brand data causes wrong verdicts — sources required, every entry reviewed.
- **Store policies.** Extensions touching many sites get stricter review; minimal permissions and clear justifications are the strategy.
- **Big browsers already protect users.** The value is the explanation, the language, local brands and transparency — not catching everything.
- **Maintenance.** Brand sites change forms and domains over time; plan for regular updates.

## Name

**Sachet** — the Nepali word for "alert". The original working name was
PhishLens, but that name is already used by a live Chrome Web Store listing
("PhishLens - Advanced Browser Security Extension for Phishing Protection"),
so the product was renamed for store submission. The GitHub repository slug
is still `phishlens`. No search found a Chrome Web Store extension named
"Sachet" (checked Nov 2026) — confirm again in the dashboard before
submitting, since store search is not exhaustive.

## Chrome Web Store

Store listing text is in `store/listing.md` and the full submission
walkthrough (developer account, $5 one-time fee, zip build, screenshots,
review, common rejections) is in `docs/store-submission.md`. The privacy
policy is `PRIVACY.md`, linked from the listing and the popup footer.

## Success metrics

Detection rate on a held-out set of known phishing URLs · false-positive rate on legitimate login pages (the most important number) · time to verdict (under 100 ms for local checks) · verified brands in the registry · weekly active users and store rating.
