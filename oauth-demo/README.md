# "Continue with IncogniAI" — OAuth demo

A tiny sample website that integrates IncogniAI's OAuth provider, so you can test the
whole flow end to end. Zero dependencies — just Node 18+ (uses built-in `http` and
global `fetch`).

## Run it

1. **Register an app** in IncogniAI → [/developers](../app/developers) → **OAuth Apps**:
   - Name: anything (e.g. `Acme Widgets`)
   - Redirect URI: `http://localhost:4567/callback`
   - Copy the **Client ID** and **Client secret** (secret is shown once).

2. **Start the demo** with those credentials:

   ```bash
   cd oauth-demo
   CLIENT_ID=incogni_xxx CLIENT_SECRET=incogni_sk_xxx node server.mjs
   ```

   By default it talks to `http://localhost:3002` (your local IncogniAI dev server).
   To test against the live tunnel instead:

   ```bash
   VECTOSILO_BASE_URL=https://chat.hsrprojects.org \
   CLIENT_ID=incogni_xxx CLIENT_SECRET=incogni_sk_xxx node server.mjs
   ```

   > If you use the tunnel URL, register the redirect URI on that instance and make
   > sure you're signed in to IncogniAI in the same browser.

3. Open **http://localhost:4567**, click **Continue with IncogniAI**, approve on the
   consent screen, and you'll be redirected back showing your name/email/id plus
   the raw token + userinfo responses.

## What it exercises

- `GET  /oauth/authorize` — the consent screen (with `state` CSRF check)
- `POST /api/oauth/token` — authorization-code → access-token exchange (client secret)
- `GET  /api/oauth/userinfo` — profile fetch with the `Bearer` token

## Config (env vars)

| Var | Default | Notes |
|-----|---------|-------|
| `CLIENT_ID` | — | required |
| `CLIENT_SECRET` | — | required |
| `VECTOSILO_BASE_URL` | `http://localhost:3002` | your IncogniAI instance |
| `PORT` | `4567` | demo server port |
| `REDIRECT_URI` | `http://localhost:<PORT>/callback` | must match the registered URI |
| `SCOPE` | `profile email` | space-separated |
