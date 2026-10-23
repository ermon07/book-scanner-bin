# Stacks — Book Scanner & Dewey Desk

A mobile-first web app that scans a book's ISBN barcode and returns its catalogue record, a **Dewey Decimal equivalent**, genre, audience and shelf-ready details. It installs as a PWA on phones.

Everything runs in the browser. Metadata and covers come from [Open Library](https://openlibrary.org); your shelf lives in `localStorage`.

## Run it

No installs or build step. Node 18+ is only needed for the tiny local static server.

```bash
npm start
# → http://127.0.0.1:4173/
```

On Windows you can also double-click **`start.cmd`** (it opens the app in your browser).

Choose another port with `PORT=5000 npm start`.

Camera scanning and PWA installation need a **secure context**: `localhost` or HTTPS. The server binds to `127.0.0.1`, so it is for this computer only.

## Using it on a phone

To use Stacks on a phone, publish this folder to any HTTPS static host (Cloudflare Pages, Netlify, GitHub Pages, your own server). Browsers require HTTPS for the camera, service worker and install prompt; plain LAN HTTP will not expose those features.

Once it is on HTTPS:

- **Android / Chrome** — after a moment an install sheet offers **Install app**, which opens the browser's native install prompt. The browser menu's *Install app* also works.
- **iPhone / iPad** — the sheet explains **Share → Add to Home Screen** (Safari and other iOS browsers show this instruction instead of a native prompt).
- **Not now** dismisses the sheet for 14 days. **Install Stacks on your phone** in the footer opens it again at any time.
- Installed, Stacks opens full screen. The app shell is cached and works offline; catalogue lookups still need a connection.

Camera scanning, the photo tab and manual ISBN entry all work on phones. The service worker is registered only on HTTPS/localhost.

## What it does

- **Scan** — live camera barcode scanning (EAN-13, EAN-8, UPC-A/E, Code 128) with `html5-qrcode`, plus a photo/file scan and manual ISBN entry.
- **Validate** — ISBN-10/13 checksum validation, ISBN-10 ⇄ ISBN-13 conversion, and a friendly reason when the barcode is a UPC rather than a book ISBN.
- **Catalogue record** — cover, title/subtitle, authors, publisher, place, dates, pages, language, ISBNs, edition, format, series, LC classification, subjects, people/places/periods, description and a link to Open Library.
- **Dewey Decimal equivalent** — a number, class label, full hierarchy, source badge, and a suggested spine label (`823 AUS` style — a shelving aid, not a formal cutter number).
- **Genre & audience** — primary and secondary genres plus a children's/young-adult/general audience estimate.
- **Shelf** — scans are saved locally (up to 50), can be reopened, removed, cleared and exported as CSV. Copy any record as JSON.
- **PWA** — manifest, maskable icons, install sheet, offline app shell.
- **Deep link** — `/?isbn=9780141439518` opens that record directly (handy for QR codes and home-screen shortcuts).

### How the Dewey number is chosen

The app is deliberately transparent about where a number came from, because catalogue DDC data is inconsistent.

1. **Catalogue record** — collect DDC values from the edition and work records, then pick the most repeated 3-digit class. The source badge reads *Catalog record*.
2. **LC classification** — if no numeric DDC exists, map the Library of Congress class (e.g. `PR` → 820, `QA` → 510) to a Dewey class. Badge: *Derived from LC classification*.
3. **Subjects and summary** — score keywords and subject headings against a curated Dewey topic table (cooking, computing, WWII, astronomy, biography, and so on). Badge: *Estimated from subjects*.
4. **Fiction fallback** — if a record is marked `[Fic]` but has no number, place it in English/American literature when the subjects make that clear; otherwise the general literature class.

The UI marks estimates clearly. They are a shelving aid, not an authoritative cataloguing record — verify before you shelve.

### Genre and audience

Genres are scored from Dewey prefixes, subject headings and the description, with fiction-specific filtering (a novel that mentions "history" stays in fiction, not the history shelves). Audience is inferred from juvenile/young-adult subject markers. Both are heuristics.

## Project layout

```
index.html               app shell, install sheet and meta tags
styles.css               mobile-first UI, desktop layout, install sheet
js/isbn.js               validation, normalisation, conversions
js/ddc.js                Dewey table, catalogue selection, inference
js/genre.js              genre, kind and audience rules
js/api.js                Open Library client, record merge and caching
js/scanner.js            camera/photo scanning wrapper
js/storage.js            local shelf and CSV export
js/app.js                UI controller, PWA install behaviour
sw.js                    service worker (app-shell cache)
manifest.webmanifest     PWA manifest
icons/                   generated 192/512/maskable/apple icons
vendor/html5-qrcode.min.js
server.mjs               dependency-free local static server
start.cmd                Windows launcher
tools/                   icon and barcode-fixture generators
tests/                   unit, PWA and live API tests
```

## Tests

```bash
npm test
```

Runs ISBN/Dewey/genre/shelf unit tests, checks the manifest/service-worker/icons, and performs live lookups against Open Library for a few representative ISBNs (Pride and Prejudice, Clean Code, Harry Potter, A Brief History of Time) plus a title-search fallback. The live tests need internet access.

Regenerate assets:

```bash
npm run icons                                # PNG app icons
node tools/generate-barcode-fixture.mjs      # test barcode image
```

## Notes & limitations

- **No backend or API key.** Lookups go straight from the browser to Open Library. If it is slow or rate-limiting, the app shows a retry state.
- **Covers** are hosted by Open Library/Internet Archive; a missing cover falls back to a typographic placeholder.
- **DDC data is messy.** Open Library can list several conflicting numbers for one ISBN; the app picks the most repeated class and shows the others as "also catalogued as".
- **Fiction markers** such as `[Fic]` and `j823` are understood, but a record with no DDC, no LCC and no useful subjects may end up without a number. The UI says so instead of inventing one.
- **Offline** covers the app shell only; saved shelf records still render, but new ISBNs need a connection.
- **Service worker updates**: bump `VERSION` in `sw.js` whenever you change cached shell files, otherwise returning visitors keep the old cached assets.
- **Privacy**: no analytics, no accounts, no server-side storage. The shelf and install-dismissal state stay in this browser's `localStorage`.
