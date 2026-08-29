@echo off
REM Double-click to start the Android emulator.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0android.ps1" %*
