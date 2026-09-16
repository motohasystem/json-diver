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

Both build scripts re-run themselves in a child `cmd`, so the window always waits for
a keypress before closing — including when a batch syntax error kills the inner run
before it can reach its own exit path.

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
- With the **Watch** toggle on, the clipboard is watched natively: a background thread
  polls `GetClipboardSequenceNumber` (via `clipboard_win::raw::seq_num`), which reports
  changes *without* opening the clipboard, so the poll never takes the global clipboard
  lock that other apps need while copying. The clipboard is only read once the number
  moves, and JSON-looking text is emitted to the webview as `clipboard-text`. Unlike the
  browser edition this needs no window focus

## MSIX (Microsoft Store)

Tauri has no MSIX bundler, so the Store package is built by handing the release
`.exe` to `MakeAppx.exe` from the Windows SDK. `build-msix.bat` does the whole
run — refresh the checkout, `npm install`, regenerate the Store logo set
(`npm run icon`), `tauri build`, stage the package layout, fill in the manifest and
pack it:

```bat
build-msix.bat [build directory]
```

Output: `desktop/src-tauri/target/release/bundle/msix/JSON Diver_<version>_x64.msix`

The package is deliberately **unsigned** — Partner Center signs it on upload. To
install one locally instead, sign it with a certificate whose subject matches the
`Publisher` value exactly, then trust that certificate on the target machine.

### Package identity

`msix/AppxManifest.xml` is a template; the build fills in four tokens. Three of them
come from `msix/identity.json`, which ships with **test values that the Store will
reject**. For a real submission they must match Partner Center (Product > Product
identity) exactly:

| Key | Partner Center field |
| --- | --- |
| `identityName` | `Package/Identity/Name` |
| `publisher` | `Package/Identity/Publisher` (`CN=...`) |
| `publisherDisplayName` | `Package/Properties/PublisherDisplayName` |

The fourth, the version, is read from `package.json` and gets `.0` appended, since
the Store requires the revision part to be zero (`0.5.0` → `0.5.0.0`).

Because the build clone is reset to `origin/main` on every run, keep your real values
outside the repository at `%USERPROFILE%\.json-diver-msix.json` (same keys); the
script prefers that file when it exists.

The identity is deliberately **JSON read by PowerShell, not `set` lines in a `.cmd`**.
cmd.exe reads a batch file in the console code page, so a publisher name like `デジ式`
stored in a UTF-8 `.cmd` would reach the manifest as mojibake and be rejected on
upload. The build prints the three values it actually used — check them against
Partner Center before uploading.

Notes on the manifest:

- `runFullTrust` is required for a packaged Win32 app. It is a restricted capability,
  so Partner Center asks you to justify it during submission — routine for desktop apps.
- The `.json` file association is declared with `windows.fileTypeAssociation`, which
  gives the same double-click behaviour as the NSIS build's registry entries.

## Files

```
desktop/
├── package.json
├── build-windows.bat       # NSIS installer build
├── build-msix.bat          # MSIX (Store) package build
├── msix/
│   ├── AppxManifest.xml    # manifest template (__TOKENS__ filled at build time)
│   └── identity.cmd        # package identity (test values by default)
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
