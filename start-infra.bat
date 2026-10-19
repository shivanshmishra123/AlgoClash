@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo [AlgoClash] Starting Infrastructure (PostgreSQL 16)
echo ===================================================

cd /d "%~dp0"

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker command not found. Please ensure Docker Desktop is installed and in your PATH.
    pause
    exit /b 1
)

echo Starting postgres container...
docker compose up -d postgres

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] PostgreSQL container is up and running on port 5432!
) else (
    echo [WARNING] Docker Compose encountered an issue. Check if Docker Desktop daemon is running.
)

echo.
