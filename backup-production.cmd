@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-production.ps1" %*
exit /b %ERRORLEVEL%
