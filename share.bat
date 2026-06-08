@echo off
cd /d "%~dp0\server"

echo.
echo ========================================
echo  Generating public share link...
echo  (Press Ctrl+C to stop sharing)
echo ========================================
echo.
npx lt --port 3001 --print-requests
