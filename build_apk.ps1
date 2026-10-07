$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\User\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\User\AppData\Local\Android\Sdk"

Set-Location "C:\Users\User\.gemini\antigravity\scratch\trampis-hunt\android"
cmd.exe /c "gradlew.bat assembleDebug --stacktrace"
