# DailyDrop iPhone PWA deployment

This is the browser-installable web version from the Capacitor project's `www/` folder. It is separate from the marketing/landing page and uses the same Supabase project/configuration as the Android app.

## Publish

1. Create (or use) a GitHub repository named `dailydrop` under `proofcall-svg`.
2. Upload the **contents** of this folder to the repository root (not the enclosing folder).
3. In GitHub: Settings -> Pages -> Deploy from a branch -> `main` -> `/ (root)` -> Save.
4. Wait for Pages to publish: `https://proofcall-svg.github.io/dailydrop/`.
5. In Supabase -> Authentication -> URL Configuration, add this exact redirect URL to the allowed Redirect URLs:
   `https://proofcall-svg.github.io/dailydrop/reset.html`
6. Test account creation, sign-in, photo upload, and password reset on the hosted URL before sharing it.

If you choose a different repository name or Pages URL, update `RESET_REDIRECT_URL` in `config.js` and the allowed Supabase redirect URL to match.

## iPhone installation

Open the published URL in Safari, tap Share, then Add to Home Screen. iOS does not allow a website to silently download/install an `.ipa`; this is the supported browser-based install route for a PWA. The app displays a small Safari installation hint on iPhone until dismissed. After adding it to the Home Screen, it opens in standalone mode.

## Connect the marketing page's iOS button

In the landing page code, change `CONFIG.IOS_STORE_URL` from an empty string to:
`https://proofcall-svg.github.io/dailydrop/`

Your existing `StoreButton` will then open the PWA instead of showing “coming soon”. On iPhone, users can follow the Safari Add to Home Screen instructions. Do not set it to an `.ipa` download URL.

## Notes

- `manifest.webmanifest`, `sw.js`, and `icons/` make the web app installable.
- The service worker caches only the same-origin app shell. It deliberately does not cache Supabase API calls or private user photos.
- This does not publish a native App Store app. It installs the web app from Safari.
- The Supabase publishable/anon key in `config.js` is client-side by design; never add a `service_role` key. Ensure Supabase Row Level Security policies remain enabled.
