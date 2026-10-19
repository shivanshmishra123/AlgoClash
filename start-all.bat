@echo off
setlocal

echo ================================================================
echo               AlgoClash Unified Launcher
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/3] Booting Infrastructure (PostgreSQL 16)...
call "%~dp0start-infra.bat"

echo.
echo [2/3] Launching AlgoClash Backend Server (Spring Boot on :8080)...
start "AlgoClash Backend [Port 8080]" cmd /k "cd /d "%~dp0backend" && mvnw.cmd spring-boot:run"

echo.
echo [3/3] Launching AlgoClash Frontend App (Vite on :5173)...
start "AlgoClash Frontend [Port 5173]" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ================================================================
echo               AlgoClash Stack Initialized!
echo ================================================================
echo  - Frontend Web UI:    http://localhost:5173
echo  - Backend API:        http://localhost:8080
echo  - Swagger OpenAPI:    http://localhost:8080/swagger-ui/index.html
echo  - WebSocket Endpoint: ws://localhost:8080/ws-algoclash
echo ================================================================
echo.
echo Opening AlgoClash in your default web browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo Press any key or close this window when done.
pause >nul
