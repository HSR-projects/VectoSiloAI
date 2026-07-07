#!/usr/bin/env bash
# Build the native KodaAI debug APK (Kotlin + Jetpack Compose).
# Pins JDK 17 + the user-local Android SDK (system default Java is 25, too new for AGP).
set -euo pipefail

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"

cd "$(dirname "$0")"
printf 'sdk.dir=%s\n' "$HOME/Android/Sdk" > local.properties

chmod +x ./gradlew
./gradlew assembleDebug --no-daemon

cp app/build/outputs/apk/debug/app-debug.apk KodaAI-native-debug.apk
echo
echo "APK ready: android/KodaAI-native-debug.apk"
