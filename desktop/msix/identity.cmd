@echo off
REM ============================================================
REM  MSIX package identity for JSON Diver.
REM
REM  For a Microsoft Store submission these three values must match
REM  Partner Center EXACTLY (Product > Product identity):
REM      MSIX_IDENTITY_NAME       = Package/Identity/Name
REM      MSIX_PUBLISHER           = Package/Identity/Publisher   (CN=...)
REM      MSIX_PUBLISHER_DISPLAY   = Package/Properties/PublisherDisplayName
REM
REM  The defaults below are TEST values: they build a valid package for local
REM  inspection, but the Store will reject them.
REM
REM  To keep your real values out of the repository (the build clone is reset to
REM  origin/main on every run), copy this file to:
REM      %USERPROFILE%\.json-diver-msix.cmd
REM  build-msix.bat prefers that copy when it exists.
REM ============================================================

set "MSIX_IDENTITY_NAME=JSONDiver"
set "MSIX_PUBLISHER=CN=JSON Diver Test"
set "MSIX_PUBLISHER_DISPLAY=JSON Diver"
