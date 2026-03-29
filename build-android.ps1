Set-ExecutionPolicy Bypass -Scope Process
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:JAVA_HOME = "C:\Program Files\Amazon Corretto\jdk17.0.18_9"
$env:ANDROID_HOME = "C:\Users\Gor\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Gor\AppData\Local\Android\Sdk"
cd D:\qwen\PPScan\ppscan-app\android
.\gradlew.bat assembleDebug
