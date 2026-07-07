#!/usr/bin/env bash
# Rebuild the KodaAI debug APK. Pins JDK 17 + the user-local Android SDK so it
# works regardless of the system default Java (which is 25 here, too new for AGP).
set -euo pipefail

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"

cd "$(dirname "$0")"

# Pull any web/config changes into the native project first.
npx cap sync android

cd android
chmod +x ./gradlew
./gradlew assembleDebug --no-daemon

APK="app/build/outputs/apk/debug/app-debug.apk"
cp "$APK" ../KodaAI-debug.apk
echo
echo "APK ready: mobile/KodaAI-debug.apk"
