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
REM  JSON Diver - build the MSIX package (Microsoft Store)
REM
REM  Usage (from cmd.exe):
REM      build-msix.bat [build directory]
REM
REM  Tauri has no MSIX bundler, so this builds the app the normal way and then
REM  packages the release .exe with MakeAppx.exe from the Windows SDK.
REM  The package is left UNSIGNED on purpose: the Store signs it on upload.
REM
REM  Identity comes from %USERPROFILE%\.json-diver-msix.cmd if that exists,
REM  otherwise from desktop\msix\identity.cmd in the repo (test values).
REM
REM  Default build directory: %USERPROFILE%\work\json-diver
REM ============================================================
setlocal EnableExtensions

set "REPO_URL=https://github.com/motohasystem/json-diver.git"
set "BUILD_DIR=%~1"
if "%BUILD_DIR%"=="" set "BUILD_DIR=%USERPROFILE%\work\json-diver"

echo ============================================
echo  JSON Diver - MSIX build
echo  Build directory: %BUILD_DIR%
echo ============================================
echo.

if exist "%USERPROFILE%\.cargo\bin" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo --- checking tools ---
call :need git.exe   || goto :fail
call :need npm.cmd   || goto :fail
call :need cargo.exe || goto :fail

REM ---- locate MakeAppx.exe from the newest installed Windows SDK ----
REM  %%ProgramFiles(x86)%% cannot be used inside a parenthesised block: the ")" in
REM  its own name closes the block while cmd parses it. Copy it out first.
set "SDKROOT=%ProgramFiles(x86)%\Windows Kits\10\bin"
set "MAKEAPPX="
for /f "delims=" %%D in ('dir /b /ad /o-n "%SDKROOT%\10.*" 2^>nul') do (
    if not defined MAKEAPPX if exist "%SDKROOT%\%%D\x64\makeappx.exe" (
        set "MAKEAPPX=%SDKROOT%\%%D\x64\makeappx.exe"
    )
)
if not defined MAKEAPPX (
    echo   [ERROR] makeappx.exe not found. Install the Windows 10/11 SDK.
    goto :fail
)
echo   ok: %MAKEAPPX%
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

REM ---- package identity (UTF-8 JSON, read by PowerShell - see identity.json) ----
set "IDJSON=%BUILD_DIR%\desktop\msix\identity.json"
if exist "%USERPROFILE%\.json-diver-msix.json" set "IDJSON=%USERPROFILE%\.json-diver-msix.json"
echo --- identity from %IDJSON% ---
echo.

REM ---- version: package.json "0.5.0" -> MSIX "0.5.0.0" (Store needs revision 0) ----
REM  No single quotes in the command: for /f ends its command string at the first one.
for /f "delims=" %%V in ('powershell -NoProfile -Command "(ConvertFrom-Json (Get-Content -Raw package.json)).version"') do set "APP_VERSION=%%V"
if not defined APP_VERSION goto :fail
set "MSIX_VERSION=%APP_VERSION%.0"
echo   Version   : %MSIX_VERSION%
echo.

echo --- npm install ---
call npm install || goto :fail
echo.

echo --- regenerating icons (Store logo set) ---
call npm run icon || goto :fail
echo.

echo --- tauri build (the first run compiles everything; expect 10+ minutes) ---
call npm run build || goto :fail
echo.

set "EXE=%BUILD_DIR%\desktop\src-tauri\target\release\json-diver.exe"
if not exist "%EXE%" (
    echo   [ERROR] %EXE% was not produced
    goto :fail
)

REM ---- stage the package layout ----
set "STAGE=%BUILD_DIR%\desktop\src-tauri\target\release\msix-stage"
set "OUTDIR=%BUILD_DIR%\desktop\src-tauri\target\release\bundle\msix"
echo --- staging %STAGE% ---
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%\Assets" || goto :fail
copy /y "%EXE%" "%STAGE%\." >nul || goto :fail

call :asset Square44x44Logo.png   || goto :fail
call :asset Square150x150Logo.png || goto :fail
call :asset StoreLogo.png         || goto :fail
REM Optional extras: copied when the icon generator produced them.
for %%A in (Square30x30Logo.png Square71x71Logo.png Square89x89Logo.png Square107x107Logo.png Square142x142Logo.png Square284x284Logo.png Square310x310Logo.png) do (
    if exist "%BUILD_DIR%\desktop\src-tauri\icons\%%A" copy /y "%BUILD_DIR%\desktop\src-tauri\icons\%%A" "%STAGE%\Assets\." >nul
)

REM ---- fill the manifest template ----
echo --- writing AppxManifest.xml ---
set "TPL=%BUILD_DIR%\desktop\msix\AppxManifest.xml"
REM Identity is read and written by PowerShell end to end, so a non-ASCII publisher
REM name never passes through the console code page. The values are echoed back from
REM the file that was actually used - check them before uploading.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$id = ConvertFrom-Json (Get-Content -Raw -Encoding UTF8 $env:IDJSON); foreach ($k in 'identityName','publisher','publisherDisplayName') { if (-not $id.$k) { Write-Host ('  [ERROR] missing in identity file: ' + $k); exit 1 }; if ($id.$k -match 'PASTE_FROM_PARTNER_CENTER') { Write-Host ('  [ERROR] still a placeholder: ' + $k); exit 1 } }; $t = [IO.File]::ReadAllText($env:TPL); $t = $t.Replace('__IDENTITY_NAME__', $id.identityName).Replace('__PUBLISHER__', $id.publisher).Replace('__PUBLISHER_DISPLAY_NAME__', $id.publisherDisplayName).Replace('__VERSION__', $env:MSIX_VERSION); [IO.File]::WriteAllText($env:STAGE + '\AppxManifest.xml', $t, (New-Object Text.UTF8Encoding $false)); Write-Host ('  Name      : ' + $id.identityName); Write-Host ('  Publisher : ' + $id.publisher); Write-Host ('  Display   : ' + $id.publisherDisplayName)" || goto :fail

REM ---- pack ----
if not exist "%OUTDIR%" mkdir "%OUTDIR%"
set "MSIX_OUT=%OUTDIR%\JSON Diver_%APP_VERSION%_x64.msix"
echo --- makeappx pack ---
"%MAKEAPPX%" pack /o /d "%STAGE%" /p "%MSIX_OUT%" || goto :fail

echo.
echo ============================================
echo  MSIX built
echo ============================================
echo %MSIX_OUT%
echo.
echo The package is UNSIGNED - that is what Partner Center expects.
echo Check the Name / Publisher / Display values printed above against
echo Partner Center before uploading.
start "" explorer "%OUTDIR%"
exit /b 0

:asset
REM Copy one required logo, falling back to the 128x128 app icon if the Store
REM logo set was not generated. Windows scales the fallback; the Store may not
REM accept it, so the warning matters.
if exist "%BUILD_DIR%\desktop\src-tauri\icons\%~1" (
    copy /y "%BUILD_DIR%\desktop\src-tauri\icons\%~1" "%STAGE%\Assets\." >nul
    exit /b 0
)
if exist "%BUILD_DIR%\desktop\src-tauri\icons\128x128.png" (
    echo   [WARN] %~1 missing - falling back to 128x128.png ^(fix before Store upload^)
    copy /y "%BUILD_DIR%\desktop\src-tauri\icons\128x128.png" "%STAGE%\Assets\%~1" >nul
    exit /b 0
)
echo   [ERROR] no icon available for %~1
exit /b 1

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
echo *** MSIX BUILD FAILED ***
exit /b 1
