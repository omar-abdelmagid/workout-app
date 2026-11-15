# iPhone interface

The app remains a static PWA served directly by GitHub Pages. No runtime build
step is required. Framework7 Core 9.3.0 is pinned under `vendor/framework7/`.

- Today, Programs, History, and Progress use separate Framework7 views.
- Programs → workout days → exercise previews use the iOS router and swipe-back.
- Starting/ending a workout replaces the Today stack to prevent returning to a
  stale Start screen. Active workouts remain available while browsing other tabs.
- Weight edits save immediately, including when dismissing the sheet by gesture.
- Alternatives use action sheets; exercise images and history details use sheets.
- Existing workout storage keys, data format, export, and backup code are retained.
- The service worker precaches pinned framework assets and exact script versions.

`native-ui.js` adapts the existing DOM renderers to Framework7. Pages leaving a
router stack move into a hidden container instead of being destroyed. This keeps
all existing element IDs and listeners available to the renderer and backup code,
with no duplicate DOM copies. Routes reuse the same page elements.

## Browser checks

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm test
```

The package dependencies are only for tests. Pull requests run the same checks
on Ubuntu 24.04. Reports, traces on failure, and layout screenshots are uploaded
as `workout-ui-results` artifacts. Tests use isolated browser storage and never
connect a real backup key.

Before merging, check on a physical iPhone: Add to Home Screen, keyboard opening
and dismissal in the weight sheet, safe areas in portrait/landscape, edge-swipe
navigation in Programs, resuming an unfinished workout, and airplane-mode reload.
Remote exercise images still require a network connection.

When changing script query versions, update `index.html` and `sw.js` together and
bump the service worker cache name.
