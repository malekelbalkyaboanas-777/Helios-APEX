@echo off
title HELIOS APEX Launcher
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies for first launch...
  call npm install
  if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting HELIOS APEX at http://localhost:3000 ...
start "" http://localhost:3000
call npm run dev
pause
