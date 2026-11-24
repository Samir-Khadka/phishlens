# Privacy Policy — Sachet (Phishing X-ray)

Last updated: 24 November 2026

Sachet is a browser extension that shows why a login page looks fake, in plain Nepali or English, before you type your password. This policy explains what the extension does with your data: in short, **it collects nothing**.

## What Sachet does

When you click the Sachet icon, the extension reads the current page's address, its forms, and its visible text, and compares them against a small built-in list of verified official domains for well-known brands. All of this analysis runs **on your own device, inside your browser**. The verdict (red, yellow, green, or gray) and the reasons for it are shown to you in the popup.

## Data we collect

**None.** Sachet does not collect, store, transmit, sell, or share:

- browsing history or URLs you visit;
- page contents or form contents;
- anything you type into a field (passwords, OTPs, PINs, or anything else);
- personal information of any kind;
- analytics, telemetry, or crash reports.

The extension makes **no network requests at all** except when you choose to click a link inside the popup (for example, "Open the official site" or "Privacy policy"), which simply opens that page in your browser like any other link.

## Permissions — why each one is needed

| Permission | Purpose |
|---|---|
| `activeTab` | Read the page you are looking at, only when you click the icon to X-ray it. |
| `storage` | Remember your language choice (English/Nepali), the automatic-protection toggle, and any reports you choose to save, on your device only. |
| `scripting` | Run the one-shot page check in the active tab when you click the icon — or when a page finishes loading, only if you turned on automatic protection. |
| `notifications` | Warn you once per tab when automatic protection finds a page that looks fake. Only used in automatic protection, never otherwise. |

**Optional host access** (`*://*/*`) is requested only when you turn on automatic protection in the popup, through the browser's own permission prompt. Turning automatic protection off gives that access back. Without it, Sachet asks for no host permissions at all.

Sachet does **not** request access to your browsing history, cookies, or all websites by default.

## Reports

The "Report this page" button saves a report **on your device only** (in the browser's local storage). It stores the page address with query parameters removed, the verdict, and the reasons — never anything you typed. Reports are not sent anywhere. A future version may offer an opt-in way to share reports with a community list; that will be off by default and clearly labelled.

## Changes to this policy

If this policy changes, the new version will be published here and in the extension's repository, with the "Last updated" date above.

## Contact

Questions: open an issue at https://github.com/Samir-Khadka/phishlens/issues
