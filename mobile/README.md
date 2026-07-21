# VectoSiloAI — Android app

A [Capacitor](https://capacitorjs.com/) native shell that loads the hosted VectoSiloAI
web app in a full-screen Android WebView. Because VectoSiloAI is a full-stack Next.js
app (chat, auth and Ollama all run server-side), the phone needs to reach the
live backend — the app does **not** bundle the site offline.

- **Backend URL:** `https://chat.hsrprojects.org` (your Cloudflare tunnel → `localhost:3002`)
- **Package:** `org.hsrprojects.vectosiloai`
- To point at a different server, edit `server.url` in [`capacitor.config.json`](capacitor.config.json), then run `./build-apk.sh`.

## Install the APK on your phone

The prebuilt debug APK is at **`VectoSiloAI-debug.apk`**.

1. Copy it to your phone (USB, Google Drive, or `adb install VectoSiloAI-debug.apk`).
2. On the phone, tap the file and allow "install from unknown sources" when prompted.
3. Launch **VectoSiloAI**. It opens straight into the live app.

> The backend must be reachable for the app to work — your machine + the
> cloudflared tunnel both need to be running. If the server is down you'll see
> the "Connecting…" splash.

## Rebuild

```bash
./build-apk.sh
```

This pins **JDK 17** and the user-local SDK at `~/Android/Sdk`, syncs config, and
produces `VectoSiloAI-debug.apk`.

### Toolchain notes (this machine)
- System default Java is 25 (too new for the Android Gradle Plugin) — the build
  script forces `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64`.
- The system SDK at `/usr/lib/android-sdk` is stale and read-only, so a fresh SDK
  was installed at `~/Android/Sdk` (platform `android-34`, build-tools `34.0.0`,
  platform-tools). `android/local.properties` points Gradle there.

## Release (signed) build

The debug APK is signed with the auto-generated debug key — fine for personal use,
not for the Play Store. For a distributable build, generate a keystore and configure
`signingConfigs` in `android/app/build.gradle`, then `./gradlew assembleRelease`.
