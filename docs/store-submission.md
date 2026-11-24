# Submitting Sachet to the Chrome Web Store

Everything in the repo is ready for submission. The actual upload needs
two things only you can do: build the store zip on your machine, and a
Chrome Web Store developer account (one-time $5 registration). The steps
below are in order; the whole thing is about an hour plus review time.

## 0. Before you start — the name

The product is **Sachet**. The original working name, PhishLens, is already
used by a live Chrome Web Store listing ("PhishLens - Advanced Browser
Security Extension for Phishing Protection", 43 users), so submitting under
that name would collide. The GitHub repo slug is still `phishlens`; only the
product name changed. You can rename the repo later in GitHub Settings if
you want them to match — old links redirect automatically.

## 1. Build the store zip (on your machine)

```bash
git clone https://github.com/Samir-Khadka/phishlens.git
cd phishlens
npm install
npm test        # engine tests must pass
npm run build   # sanity check — .output/chrome-mv3
npm run zip     # produces the store-ready zip (e.g. .output/sachet-0.1.0-chrome.zip)
```

Do a quick manual pass first: `npm run dev`, load the unpacked build in
Chrome, and X-ray the local test fixtures plus a few real login pages
(esewa.com.np, khalti.com, accounts.google.com). False positives on real
sites are the most important thing to catch before submission.

## 2. Register as a Chrome Web Store developer ($5, one time)

1. Go to https://chrome.google.com/webstore/devconsole and sign in with the
   Google account you want to publish under.
2. Pay the one-time $5 developer registration fee (card payment, charged by
   Google — Muse cannot pay this for you).
3. Fill in the developer profile (name, contact email). This is what users
   see as "Offered by".

## 3. Create the listing

1. In the Developer Dashboard, click **New Item** and upload the zip from
   step 1.
2. Fill in the fields from `store/listing.md` (name, short + detailed
   description, category Privacy & Security, website, privacy policy URL).
3. Privacy practices tab: declare **no data collected** — the extension
   makes no network requests and stores nothing off-device. The dashboard
   will ask about each data type; answer "not collected" for all of them.
   This must match `PRIVACY.md` exactly.
4. Add screenshots (1280×800 or 640×400, at least 1):
   - Load the unpacked build, open the fake eSewa fixture
     (`tests/fixtures/fake-esewa-login.html`), click the icon, screenshot
     the red verdict. Lead with this one.
   - Green verdict on the real esewa.com.np login page.
   - Nepali verdict (toggle to नेपाली in the popup first).
   - The reasons list expanded.
   - Capture with the browser window at 1280×800, popup open, no personal
     data visible. Never mock screenshots up — reviewers compare them
     against the real extension.
5. Set the store icon (already in the zip: 128px), and the distribution:
   public, all regions.

## 4. Submit and wait for review

- Click **Submit for review**. First submissions from a new developer
  account usually take a few days; it can take longer.
- Google may ask for a justification of the `scripting` permission, the
  optional host access, and the `notifications` permission, and a video
  or extra screenshots showing the extension working. The answers are
  in the README ("Permissions") and `PRIVACY.md`: scripting runs the
  one-shot page check only when the user clicks the icon (or when a page
  finishes loading, only in the opt-in automatic-protection mode);
  optional host access is requested only when the user turns that mode
  on, through the browser's own prompt; notifications warn once per tab
  about a red page, only in that mode.
- Common rejection reasons and how this listing avoids them:
  - **Unnecessary permissions** — we ask for `activeTab`, `storage`,
    `scripting` only; no host permissions, no history, no cookies.
  - **Misleading claims** — the listing never says "safe"; green means
    "no warning signs found".
  - **Missing privacy policy** — `PRIVACY.md` is linked in the listing and
    in the popup footer.
  - **Single purpose** — one purpose: explain whether a login page looks
    fake. No extra features bundled in.
- If rejected, the dashboard states the exact policy section. Fix that one
  thing and resubmit — do not rebuild the whole listing.

## 5. After approval

- The listing goes live; users install from the store page.
- Announce it in the repo README (add the store badge/link).
- Firefox Add-ons next: `npm run zip:firefox`, then submit at
  https://addons.mozilla.org/developers/ (free account, no fee). Firefox
  review also takes a few days and asks for source code — the repo is
  already public, which is what they want.

## What Muse can do for you here

- The browser can do the dashboard upload and form-filling once you have
  the developer account and the built zip file — say the word and hand over
  the zip.
- It cannot pay the $5 fee or create the Google developer account for you.
