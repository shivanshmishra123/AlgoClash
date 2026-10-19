@echo off
setlocal

echo ===================================================
echo [AlgoClash] Starting Frontend (Vite Dev Server :5173)
echo ===================================================

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing npm dependencies...
    call npm install
)
call npm run dev
