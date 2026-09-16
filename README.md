# JSON Diver

A viewer/editor for reading and editing JSON as a collapsible tree.
Deep structures stay easy to follow even in large documents, with pretty printing,
schema validation and a minimap built in.

JSON Diver comes in **two editions**.

## 🌐 Browser edition

No installation — just open it in a browser.

**▶ https://json.kintoys.app**

## 🖥️ Native edition (Windows desktop)

A Windows app built with Tauri 2 that opens `.json` files on double-click.

**▶ [Download the latest installer (Releases)](https://github.com/motohasystem/json-diver/releases/latest)**

Run `JSON Diver_<version>_x64-setup.exe` to install
(no administrator rights required / current-user install).

What the native edition adds:

- Launch and load by double-clicking a `.json` file (OS file association)
- Save back over the original file with **Ctrl+S** (UTF-8, no BOM)
- Double-click another `.json` → it opens in a **new window** (multi-window support)
- Open an empty window with the **New Window button / Ctrl+N**

📖 For detailed instructions, see the [usage guide (docs/usage.md)](docs/usage.md).

## Main features (both editions)

- Renders JSON as a collapsible tree, expandable by depth
- View / Edit / Raw modes (Raw edits the JSON text directly)
- **Pretty** toggle (on by default): 2-space pretty print ⇄ one-line minify, applied
  across the Raw view, pastes, and Copy/Download alike
- **Watch** toggle: JSON copied to the clipboard is loaded automatically (instantly in
  the native edition; on returning to the tab in Chrome/Edge)
- Inline value editing, copy, download
- Validation against a JSON Schema
- Minimap for an overview and quick jumps

## Repository layout

| Path | Contents |
| --- | --- |
| [`dev/`](dev/) | The front end itself (shared by the browser and native editions) |
| [`desktop/`](desktop/) | Windows native edition (Tauri 2). Build steps: [`desktop/README.md`](desktop/README.md) |

See [`desktop/README.md`](desktop/README.md) for how to build the native edition.
