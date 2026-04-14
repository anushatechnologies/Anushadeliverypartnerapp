$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "e:\Anushadeliverypartnerapp\android"
.\gradlew.bat clean
.\gradlew.bat bundleRelease
