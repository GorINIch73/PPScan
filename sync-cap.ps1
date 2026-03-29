Set-ExecutionPolicy Bypass -Scope Process
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
cd D:\qwen\PPScan\ppscan-app
npx cap sync android
