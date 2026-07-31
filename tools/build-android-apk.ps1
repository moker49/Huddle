[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$defaultSdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$androidSdkPath = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, $defaultSdkPath) |
    Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
    Select-Object -First 1

if (-not $androidSdkPath) {
    throw 'Android SDK not found. Install it with Android Studio, then set ANDROID_HOME or ANDROID_SDK_ROOT.'
}

$javaCandidates = @(@(
    $env:JAVA_HOME,
    'C:\Program Files\Android Studio\jbr'
) | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe')) })

if (-not $javaCandidates) {
    throw 'Java not found. Install Android Studio or set JAVA_HOME to a supported JDK.'
}

$platform36Path = Join-Path $androidSdkPath 'platforms\android-36'
if (-not (Test-Path -LiteralPath $platform36Path)) {
    throw 'Android SDK Platform 36 is required. In Android Studio, open SDK Manager and install Android 16.0 (API 36).'
}

$env:ANDROID_HOME = $androidSdkPath
$env:ANDROID_SDK_ROOT = $androidSdkPath
$env:JAVA_HOME = $javaCandidates[0]
$env:Path = "$(Join-Path $androidSdkPath 'platform-tools');$(Join-Path $env:JAVA_HOME 'bin');$env:Path"

Push-Location $projectRoot
try {
    Write-Host 'Generating Android project...'
    & npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) {
        throw "Expo prebuild failed with exit code $LASTEXITCODE."
    }

    $gradleWrapper = Join-Path $projectRoot 'android\gradlew.bat'
    if (-not (Test-Path -LiteralPath $gradleWrapper)) {
        throw 'Expo did not generate android\gradlew.bat.'
    }

    Write-Host 'Building debug APK...'
    Push-Location (Join-Path $projectRoot 'android')
    try {
        & $gradleWrapper assembleDebug
    }
    finally {
        Pop-Location
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed with exit code $LASTEXITCODE."
    }

    $apkPath = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
    if (-not (Test-Path -LiteralPath $apkPath)) {
        throw 'Gradle finished but app-debug.apk was not found.'
    }

    Write-Host "`nAPK created: $apkPath" -ForegroundColor Green
}
finally {
    Pop-Location
}
