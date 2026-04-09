$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "C:\Users\venka\OneDrive\Desktop\fi\adp93\android"
.\gradlew.bat bundleRelease "-PversionCode=95" "-PversionName=2.4.18"
