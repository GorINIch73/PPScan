#!/bin/bash
cd "$(dirname "$0")/ppscan-app"

echo "=== Build Vue project ==="
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "=== Sync to Android ==="
npx cap sync android
if [ $? -ne 0 ]; then
    echo "Cap sync failed!"
    exit 1
fi

echo "=== Build complete ==="
echo "Open android/ folder in Android Studio to build APK"
