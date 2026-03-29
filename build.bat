@echo off
cd /d D:\qwen\PPScan\ppscan-app
echo === Build Vue project ===
call "C:\Program Files\nodejs\npm.cmd" run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

echo === Sync to Android ===
call npx cap sync android
if %errorlevel% neq 0 (
    echo Cap sync failed!
    pause
    exit /b %errorlevel%
)

echo === Build complete ===
echo Open D:\qwen\PPScan\android in Android Studio to build APK
pause
