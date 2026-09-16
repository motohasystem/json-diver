@echo off
REM Always keep the window open: the real script runs in a child cmd, so this
REM outer pass still pauses even when a syntax error kills the inner run before
REM it can reach its own exit path. No parentheses here on purpose - %ERRORLEVEL%
REM inside a block would expand when the block is parsed, not when it runs.
if "%JD_RUN%"=="1" goto :run
set "JD_RUN=1"
cmd /c ""%~f0" %*"
set "JD_RC=%ERRORLEVEL%"
set "JD_RUN="
echo.
pause
exit /b %JD_RC%

:run
set "JD_RUN="
REM ============================================================
REM  JSON Diver - build the Windows installer (Tauri 2 / NSIS)
REM
REM  Usage (from cmd.exe):
REM      build-windows.bat [build directory]
REM
REM  The repository lives in WSL and cargo cannot build from a UNC
REM  path (\\wsl.localhost\...), so this script keeps a Windows-side
REM  clone and builds there. The clone is a build-only copy: it is
REM  hard-reset to origin/main on every run, so never edit it.
REM
REM  Default build directory: %USERPROFILE%\work\json-diver
REM ============================================================
setlocal EnableExtensions

set "REPO_URL=https://github.com/motohasystem/json-diver.git"
set "BUILD_DIR=%~1"
if "%BUILD_DIR%"=="" set "BUILD_DIR=%USERPROFILE%\work\json-diver"

echo ============================================
echo  JSON Diver - desktop build
echo  Build directory: %BUILD_DIR%
echo ============================================
echo.

REM ---- make sure the rust toolchain is on PATH ----
if exist "%USERPROFILE%\.cargo\bin" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo --- checking tools ---
call :need git.exe   || goto :fail
call :need npm.cmd   || goto :fail
call :need cargo.exe || goto :fail
echo.

REM ---- get / refresh the Windows-side copy ----
if exist "%BUILD_DIR%\.git" (
    echo --- updating existing checkout ---
    git -C "%BUILD_DIR%" fetch --prune origin || goto :fail
    git -C "%BUILD_DIR%" reset --hard origin/main || goto :fail
) else (
    echo --- cloning %REPO_URL% ---
    git clone "%REPO_URL%" "%BUILD_DIR%" || goto :fail
)
git -C "%BUILD_DIR%" log -1 --oneline
echo.

cd /d "%BUILD_DIR%\desktop" || goto :fail

echo --- npm install ---
call npm install || goto :fail
echo.

echo --- tauri build (the first run compiles everything; expect 10+ minutes) ---
call npm run build || goto :fail

set "NSIS_DIR=%BUILD_DIR%\desktop\src-tauri\target\release\bundle\nsis"
echo.
echo ============================================
echo  Build finished
echo ============================================
dir /b "%NSIS_DIR%\*.exe"
echo.
echo Installer folder: %NSIS_DIR%
start "" explorer "%NSIS_DIR%"
exit /b 0

:need
where %1 >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] %1 not found in PATH
    exit /b 1
)
echo   ok: %1
exit /b 0

:fail
echo.
echo *** BUILD FAILED ***
exit /b 1
