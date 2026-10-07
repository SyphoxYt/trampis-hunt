$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME = "C:\Users\User\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\User\AppData\Local\Android\Sdk"

Set-Location "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\android"
cmd.exe /c "gradlew.bat assembleDebug --stacktrace"

if ($LASTEXITCODE -eq 0) {
    Copy-Item "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\android\app\build\outputs\apk\debug\app-debug.apk" "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\trampis-hunt.apk" -Force
    Write-Host "SUCCESS: APK created at C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\trampis-hunt.apk" -ForegroundColor Green
    Get-Item "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\trampis-hunt.apk" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
} else {
    Write-Host "ERROR: Gradle assembleDebug failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
