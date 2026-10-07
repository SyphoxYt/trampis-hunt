@echo off
echo ========================================================
echo    Building Trampis Hunt Android APK (Debug)
echo ========================================================

echo [1/3] Building Web Assets...
call npm run build

echo [2/3] Syncing Capacitor Native Android Project...
call npx cap sync android

echo [3/3] Compiling APK with Gradle...
cd android
call gradlew.bat assembleDebug

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo ========================================================
    echo  SUCCESS! APK generated at:
    echo  android\app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
) else (
    echo ========================================================
    echo  If Gradle reported missing Android SDK or Java 17+,
    echo  open the project in Android Studio:
    echo    npx cap open android
    echo  and click: Build > Build Bundle(s) / APK(s) > Build APK(s)
    echo ========================================================
)

pause
