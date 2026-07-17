@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "NODE_VERSION=22.13.1"
set "NODE_MSI=%TEMP%\node-v%NODE_VERSION%-x64.msi"

echo.
echo Huddle setup
echo ------------

where node >nul 2>&1
if errorlevel 1 goto install_node

for /f "delims=" %%V in ('node -p "process.versions.node"') do set "CURRENT_NODE=%%V"
echo Found Node.js %CURRENT_NODE%.
echo 22.13.x is required by this project.
echo %CURRENT_NODE% | findstr /b "22.13." >nul
if not errorlevel 1 goto check_env

:install_node
echo Installing Node.js %NODE_VERSION%...

where winget >nul 2>&1
if not errorlevel 1 (
  winget install --id OpenJS.NodeJS --version %NODE_VERSION% --exact --silent --accept-package-agreements --accept-source-agreements
  if not errorlevel 1 goto refresh_path
  echo winget could not install the required version. Trying the official MSI.
)

echo Downloading the official Node.js installer...
if exist "%NODE_MSI%" del /q "%NODE_MSI%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi' -OutFile '%NODE_MSI%'"
if errorlevel 1 (
  echo ERROR: Node.js download failed.
  exit /b 1
)

msiexec.exe /i "%NODE_MSI%" /qn /norestart
if errorlevel 1 (
  echo ERROR: Node.js installation failed. Run this file as Administrator.
  exit /b 1
)

:refresh_path
set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is installed but was not found on PATH.
  echo Close and reopen this window, then run this file again.
  exit /b 1
)

for /f "delims=" %%V in ('node -p "process.versions.node"') do set "CURRENT_NODE=%%V"
echo Using Node.js %CURRENT_NODE%.
echo %CURRENT_NODE% | findstr /b "22.13." >nul
if errorlevel 1 (
  echo ERROR: Node.js 22.13.x is required, but %CURRENT_NODE% is active.
  exit /b 1
)

:check_env
if not exist ".env" (
  echo ERROR: .env was not found.
  echo Create .env with the Supabase values before running this script.
  exit /b 1
)

findstr /b "EXPO_PUBLIC_SUPABASE_URL=" .env >nul
if errorlevel 1 (
  echo ERROR: EXPO_PUBLIC_SUPABASE_URL is missing from .env.
  exit /b 1
)

findstr /b "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" .env >nul
if errorlevel 1 (
  echo ERROR: EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing from .env.
  exit /b 1
)

if not exist "node_modules" (
  echo Installing project dependencies with npm ci...
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    exit /b 1
  )
) else (
  echo node_modules already exists. Skipping dependency installation.
)

echo.
echo Ready...

