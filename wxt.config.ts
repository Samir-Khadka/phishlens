import { defineConfig } from 'wxt';

// Sachet — Phishing X-ray browser extension (Manifest V3).
// One codebase builds for Chrome/Edge (Chromium) and Firefox.
//
// Permissions are deliberately minimal by default: the user clicks the
// icon to "X-ray this page". No host permissions, no browsing history,
// no cookies. Automatic protection is opt-in: turning it on asks the
// browser for host access (optional_host_permissions) and shows a
// notification when a red page is found. It is off until the user
// chooses it, with a plain-language explanation of why.
export default defineConfig({
  manifest: {
    name: 'Sachet — Phishing X-ray',
    description:
      'Shows why a login page looks fake, in plain Nepali or English, before you type your password.',
    homepage_url: 'https://github.com/Samir-Khadka/phishlens',
    permissions: ['activeTab', 'storage', 'scripting', 'notifications'],
    optional_host_permissions: ['*://*/*'],
    action: {
      default_title: 'Sachet — X-ray this page',
    },
    icons: {
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    // No content_scripts: page signals are collected by a one-shot
    // injected function (see src/lib/collect.ts) — by the popup when the
    // user clicks the icon, or by the background worker when automatic
    // protection is on. See README.md "Permissions" for the reasoning.
  },
});
