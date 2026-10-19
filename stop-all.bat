@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo               AlgoClash Shutdown Utility
echo ================================================================
echo.

echo [1/3] Terminating Backend process on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo Stopping process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [2/3] Terminating Frontend process on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Stopping process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [3/3] Stopping Docker infrastructure containers...
cd /d "%~dp0"
where docker >nul 2>&1
if %ERRORLEVEL% equ 0 (
    docker compose stop postgres
    echo PostgreSQL container stopped.
) else (
    echo Docker not found, skipping container stop.
)

echo.
echo ================================================================
echo [SUCCESS] AlgoClash development stack stopped cleanly.
echo ================================================================
timeout /t 3 /nobreak >nul
