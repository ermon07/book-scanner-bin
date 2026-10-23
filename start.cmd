@echo off
cd /d "%~dp0"
node server.mjs --open
echo.
echo Stacks has stopped. Press any key to close this window.
pause >nul
