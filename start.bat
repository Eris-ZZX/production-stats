@echo off
title Production Stats Server
cd /d "%~dp0"

echo ========================================
echo  Production Stats System - Starting...
echo ========================================

REM Install server deps if needed
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server && call npm install && cd ..
)

REM Install frontend deps if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

REM Build frontend if dist doesn't exist
if not exist "dist" (
    echo Building frontend...
    call npm run build
)

echo Starting server on port 3001...
cd server
start "Backend" cmd /c "npx tsx src/index.ts"
cd ..

echo.
echo ========================================
echo  Local:    http://localhost:3001
echo  Share:    run share.bat
echo ========================================
start http://localhost:3001
pause
