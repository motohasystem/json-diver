# JSON Diver — Desktop (Tauri 2 / Windows)

The Windows desktop edition, which opens `.json` files on double-click.
It reuses `../dev/` as-is for the front end (pointed at directly by Tauri's
`frontendDist`).

## Prerequisites

- **Node.js**: v24 line verified
- **Rust**: 1.96 verified — install it with the steps below if `cargo` is missing

### Installing the Rust toolchain (first time only)

1. Open PowerShell and run this (fetches and runs rustup-init):

   ```powershell
   winget install --id Rustlang.Rustup -e
   ```

   Or use the official installer directly:
   <https://www.rust-lang.org/tools/install>

2. Reopen your terminal and check it works:

   ```bash
   rustc --version
   cargo --version
   ```

3. The **MSVC build tools** (C++ Build Tools) are required too.
   If they are missing, add the "Desktop development with C++" workload from the
   Visual Studio Installer, or install the Build Tools on their own with:

   ```powershell
   winget install --id Microsoft.VisualStudio.2022.BuildTools -e
   ```

## Development and builds

```bash
cd desktop
npm install
npm run dev      # run in development (no hot reload; the front end is static)
npm run build    # produce the NSIS installer
```

Build output:
`desktop/src-tauri/target/release/bundle/nsis/JSON Diver_<version>_x64-setup.exe`

### Building from a WSL checkout

Windows `cargo` cannot build from a UNC path (`\\wsl.localhost\...`), so a
checkout that lives in WSL cannot be built in place. `build-windows.bat` handles
that: run it from `cmd.exe` and it keeps a Windows-side clone, refreshes it from
`origin/main`, and runs the build there.

```bat
build-windows.bat [build directory]
```

The build directory defaults to `%USERPROFILE%\work\json-diver`. That clone is a
build-only copy — it is hard-reset to `origin/main` on every run, so commit and
push your changes before building, and never edit it directly.

## Associating `.json`

1. Run the NSIS installer above to install the app
2. Right-click any `.json` → "Open with" → "JSON Diver"
3. Tick "Always use this app" to make it the default

## Behavior

- On startup, one `.json` is picked up from `argv` and loaded
- After editing, **Ctrl+S** overwrites the original file (UTF-8, no BOM)
- When started without arguments, the **Save button** or Ctrl+S opens a
  destination picker
- Double-clicking another `.json` while the app is running opens a **new window**
  in the same process showing that file
  (`tauri-plugin-single-instance` collapses second launches while still allowing
  multiple windows)
- The **New Window** button or **Ctrl+N** opens an empty new window

## Files

```
desktop/
├── package.json
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/                  # generated from favicon.svg
    └── src/main.rs
```

Opening `../dev/index.html` in a plain browser still works as before
(`desktop.js` is a no-op without `window.__TAURI__`).

## Regenerating the icons

After updating `dev/favicon.svg`:

```bash
cd desktop
npm run icon
```

That regenerates the whole `src-tauri/icons/` set (requires the Tauri CLI to be
installed).
