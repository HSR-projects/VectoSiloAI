# KodaAI — Native Android app

A **true native** Android client built in **Kotlin + Jetpack Compose** (no WebView,
no web bundle). It talks directly to your existing KodaAI backend API over HTTPS.

- **Backend:** `https://chat.hsrprojects.org` (set via `API_BASE_URL` in [app/build.gradle.kts](app/build.gradle.kts))
- **Package:** `org.hsrprojects.kodaai`
- **Min Android:** 7.0 (API 24) · **Target:** Android 14 (API 34)

## What v1 covers

- **Auth** — native sign in / create account against `/api/auth/*`, plus
  **Continue with Google** (runs the server OAuth flow in a WebView and adopts
  the resulting session cookie). The session (`koda_session`) is persisted, so
  you stay logged in across restarts.
- **Streaming chat** — real token-by-token streaming from `/api/chat` (SSE),
  rendered natively with **Markdown** (headings, bold/italic, inline code, code
  blocks, lists, blockquotes, links). Model picker from `/api/ollama/models`.
- **Search-augmented answers** — the search toggle runs the same pipeline as web:
  `/api/route` → `/api/search`, with native **source cards** above the answer and
  tappable **follow-up** questions below it.
- **Saved chats** — conversations persist to the backend (`/api/threads`), so they
  survive restarts **and sync with the web app**. A side drawer (menu icon) lists
  past chats; tap to reopen, swipe-free delete, "+" starts a new one.
- **Artifacts as code** — `[[website]]`/`<koda-file>` directives render as labelled
  code blocks with Copy, and HTML blocks get a WebView **Preview**.

Not yet ported (web-only for now): artifacts (chess, Koda's Computer sandbox,
slides, sheets, website builder), agent/swarm panels, image generation, billing,
attachments, thread history/sidebar. The architecture (typed `KodaClient` +
ViewModels) is set up to add these incrementally.

## Install

Prebuilt debug APK: **`KodaAI-native-debug.apk`**.

```bash
adb install -r KodaAI-native-debug.apk
```

…or copy it to your phone and tap to install (allow "unknown sources").

> Shares the package id `org.hsrprojects.kodaai` with the old Capacitor build in
> `../mobile`. Both use the same debug signing key, so installing this one updates
> over it cleanly. You can delete the `mobile/` folder if you're going fully native.

## Rebuild

```bash
./build-apk.sh
```

Pins **JDK 17** and the user-local SDK at `~/Android/Sdk`, then produces
`KodaAI-native-debug.apk`.

## Project layout

```
app/src/main/java/org/hsrprojects/kodaai/
  KodaApp.kt            Application — initialises the HTTP client
  MainActivity.kt       Compose entry + root nav (booting → auth → chat)
  data/
    SessionCookieJar.kt Persists the session cookie across restarts
    Dto.kt              Serializable request/response models
    KodaClient.kt       OkHttp client + all API calls incl. SSE chat parsing
  ui/
    MainViewModel.kt    Session restore / logout
    theme/Theme.kt      Dark Material3 theme
    auth/               AuthScreen + AuthViewModel
    chat/               ChatScreen + ChatViewModel (route→search→stream)
```

## Release build

The debug APK is signed with the debug key — fine for sideloading, not for Play.
For a distributable build, add a keystore + `signingConfigs` in `app/build.gradle.kts`
and run `./gradlew assembleRelease`.
