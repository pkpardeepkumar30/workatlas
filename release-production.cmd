@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\release-production.ps1" %*
exit /b %ERRORLEVEL%
