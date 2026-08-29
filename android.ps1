# Starts the Android 15 emulator (Pixel 8, Google Play).
#   .\android.ps1              start it
#   .\android.ps1 -Cold        ignore the saved snapshot and boot from scratch
#   .\android.ps1 -Wipe        factory reset, then boot
#   .\android.ps1 -Stop        shut it down
param(
    [switch]$Cold,
    [switch]$Wipe,
    [switch]$Stop
)

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$avd = "Pixel8_API35"
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk

$emulator = "$sdk\emulator\emulator.exe"
$adb      = "$sdk\platform-tools\adb.exe"

if (-not (Test-Path $emulator)) {
    Write-Host "Emulator not found at $emulator" -ForegroundColor Red
    exit 1
}

if ($Stop) {
    & $adb emu kill 2>$null
    Write-Host "Emulator stopped." -ForegroundColor Cyan
    exit 0
}

$running = (& $adb devices | Select-String "^emulator-\d+\s+device")
if ($running) {
    Write-Host "Already running: $($running.Line.Trim())" -ForegroundColor Cyan
    exit 0
}

$args = @("-avd", $avd, "-gpu", "auto")
if ($Cold) { $args += "-no-snapshot-load" }
if ($Wipe) { $args += "-wipe-data" }

Write-Host "Starting $avd ..." -ForegroundColor Cyan

# Launched through WMI on purpose: that puts the emulator outside this shell's
# job object, so it keeps running after the script (or the terminal) exits.
$cmdLine = ('"{0}" {1}' -f $emulator, ($args -join ' '))
$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine      = $cmdLine
    CurrentDirectory = "$sdk\emulator"
}
if ($r.ReturnValue -ne 0) {
    Write-Host "Could not start the emulator (code $($r.ReturnValue))." -ForegroundColor Red
    exit 1
}

# wait until Android is actually usable
& $adb start-server | Out-Null
for ($i = 0; $i -lt 60; $i++) {
    $booted = (& $adb shell getprop sys.boot_completed 2>$null | Out-String).Trim()
    $anim   = (& $adb shell getprop init.svc.bootanim 2>$null | Out-String).Trim()
    if ($booted -eq "1" -and $anim -eq "stopped") {
        Write-Host "Ready after $($i * 3)s." -ForegroundColor Green
        & $adb devices
        exit 0
    }
    Start-Sleep -Seconds 3
}
Write-Host "Still booting after 3 minutes - check the emulator window." -ForegroundColor Yellow
