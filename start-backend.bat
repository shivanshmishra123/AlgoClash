@echo off
setlocal

echo ===================================================
echo [AlgoClash] Starting Backend (Spring Boot :8080)
echo ===================================================

cd /d "%~dp0backend"

if not exist "mvnw.cmd" (
    echo [ERROR] mvnw.cmd not found in %~dp0backend.
    pause
    exit /b 1
)

call mvnw.cmd spring-boot:run
