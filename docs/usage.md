# JSON Diver User Guide

JSON Diver is a viewer/editor for reading and editing JSON as a collapsible tree.
This guide covers everything the browser and desktop editions share, plus the
features specific to the desktop edition.

- 🌐 Browser edition: <https://json.kintoys.app> (no installation)
- 🖥️ Desktop edition (Windows): [download the latest installer from Releases](https://github.com/motohasystem/json-diver/releases/latest)

For developer information (build steps, internals), see [`dev/README.md`](../dev/README.md)
and [`desktop/README.md`](../desktop/README.md).

---

## Quick start

1. Open JSON Diver (for the browser edition, just open the page)
2. Load some JSON — any of these works:
   - Press **Ctrl+V** anywhere on the page (as long as no text field has focus)
   - Use the **Paste** button to read the clipboard
   - **Drag & drop** a `.json` file or text onto the page
   - Use the **Sample** button to load demo data

   Pasted and dropped JSON is pretty printed with 2-space indentation by
   **Pretty** (on by default). Turn **Pretty** off in the toolbar to keep
   everything minified to one line instead.
3. The tree appears fully expanded — collapse, browse and edit from there

Whatever you load is saved to the browser (`localStorage`) automatically and
restored the next time you open the app.

## Screen layout

```
┌───────────────────────────────────────────────┬────────────────┐
│ [Sample][Paste][Pretty][Copy][Download][Clear]│  Types         │
│                [View|Edit|Raw] [Undo][Redo]   │                │
│ ─ depth bar (expand / collapse by depth) ─────│  Schema        │
│                                               │                │
│   JSON tree area                              │  Minimap       │
│                                               │                │
└───────────────────────────────────────────────┴────────────────┘
```

- **Left**: toolbar, depth bar, JSON tree
- **Right sidebar**: **Types** (type icon legend), **Schema** (JSON Schema input),
  **Minimap**, version information

## The three modes

Switch between **View / Edit / Raw** with the switch on the right of the toolbar.

| Mode | Purpose |
| --- | --- |
| **View** | Read-only: collapse, copy, zoom |
| **Edit** | Inline value editing and drag & drop node moves |
| **Raw** | Edit the raw JSON text directly |

### View mode (reading)

- Click **▸ / ▾** to expand or collapse a node
- **Hover** a collapsed object/array to see a mini tree of its contents in a tooltip
- Long strings are truncated (hover for the full text in a popup)
- Hovering a row reveals buttons on the right:
  - **📋** — copy that node and everything below it as JSON
  - **▾▾ / ▸▸** — expand or collapse all sibling nodes (containers at the same
    level). Scrolling is corrected automatically so the row you clicked stays
    under the cursor.

### Edit mode (editing)

- **Click a value** to start editing it inline (string / number / boolean)
  - **Enter** commits, **Esc** cancels
  - Strings containing newlines open a multi-line editor; **Ctrl+Enter** commits
  - Booleans are edited with a true/false picker
- Drag the **⋮⋮ handle** at the start of a row to move a node
  - The drop position decides the operation: insert before / move inside /
    insert after (drop on the top, middle or bottom of the target row)
  - With a schema loaded, **moves that would add violations are blocked** and
    "Would violate the schema" is shown
- **Undo (Ctrl+Z) / Redo (Ctrl+Shift+Z or Ctrl+Y)** step through the edit history

### Raw mode (text editing)

- A text editor replaces the tree so you can rewrite the JSON directly
- Returning to View / Edit mode parses the text and applies it to the tree
- The text form follows the **Pretty** toggle:
  - ON (default) … always shown and inserted with 2-space indentation
  - OFF … always shown and inserted minified to one line
- Flipping the toggle immediately re-formats the open Raw editor and the whole
  document

## Toolbar

| Button | What it does |
| --- | --- |
| **Sample** | Load demo JSON (includes escaped JSON and a large array) |
| **Paste** | Load the contents of the clipboard |
| **Pretty** | Toggle that decides the JSON text form (highlighted = on; on by default, stored in the browser). ON = 2-space pretty print, OFF = minified to one line. It applies to the Raw view, pastes/drops, Copy and Download alike, and flipping it re-formats the current document immediately |
| **Copy** | Copy the whole JSON to the clipboard |
| **Download** | Download as `json-diver-YYYYMMDD-HHMMSS.json` |
| **Clear** | Clear the data and the stored copy (asks for confirmation; Undo restores it) |
| **↶ Undo / Redo ↷** | Undo and redo edits |
| **⚠ N** | Schema violation badge (shown only when there are violations). Click to jump to the first one |

## Depth bar (expand / collapse by depth)

The bar above the tree holds one **expand/collapse button per depth**.

- The number on each button is how many containers (objects/arrays) live at that depth
- The color shows the state: **all open / partly open / all closed**
- Clicking expands or collapses every container at that depth
- Hovering highlights the nodes at that depth in the tree

Handy for things like "open down to depth 2 and take in the whole shape".

## Escaped JSON (🪆)

When a value is a JSON string (it starts with `{` or `[` and parses successfully),
it is detected automatically and marked with the 🪆 icon.

- **Hover** — preview the inner structure in a tooltip
- **Click** — zoom into the contents in a large modal
- Nested escaped JSON is supported too (modals stack up and carry a "depth N" badge)
- **Esc** or a click on the backdrop closes one level at a time

This shines when reading JSON embedded as a string inside an API response.

## JSON Schema validation

Paste a JSON Schema into the **Schema** box in the right sidebar and the data on
screen is **validated in real time**.

- Violating rows are highlighted in red; hover to see why
- A **⚠ N** badge appears in the toolbar — click it to jump to the first violation
- The schema is saved to `localStorage` and reapplied next time; empty the box to drop it
- In Edit mode, node moves that would add violations are blocked up front

Supported keywords (a subset):
`type` (including `integer`, and arrays of types) / `const` / `enum` / `properties` /
`patternProperties` / `additionalProperties` / `required` / `items` (tuple form
included) / `prefixItems` / `minItems` / `maxItems` / `oneOf` / `anyOf` / `$ref`
(internal `#/...` references)

## Minimap

The lower part of the right sidebar shows the whole tree in miniature.

- Colored bars per type give you the shape at a glance
- A translucent frame marks the range currently on screen
- **Click or drag** to scroll straight to that position
- Zoom modals get their own independent minimap

## Keyboard shortcuts

| Key | What it does |
| --- | --- |
| **Ctrl+V** | Paste JSON anywhere on the page (except while a text field has focus) |
| **Ctrl+Z** | Undo |
| **Ctrl+Shift+Z** / **Ctrl+Y** | Redo |
| **Enter** | Commit an inline edit |
| **Ctrl+Enter** | Commit in the multi-line editor |
| **Esc** | Cancel an edit / close one modal level |
| **Ctrl+S** | [Desktop edition] Save to file |
| **Ctrl+N** | [Desktop edition] Open a new window |

On a Mac, ⌘ works in place of Ctrl.

## Saving and restoring data

- The JSON and the schema you enter are saved to `localStorage` automatically and
  restored on reload or on your next visit
- The **Clear** button erases both the input and the stored copy (clear the schema
  by emptying its box)
- Data is stored only inside your browser and is never sent anywhere

## Extra features in the desktop edition (Windows)

The desktop edition is the same screen as the browser edition plus file handling.

### Installation and file association

1. Download `JSON Diver_<version>_x64-setup.exe` from [Releases](https://github.com/motohasystem/json-diver/releases/latest)
   and run it (no administrator rights required)
2. Right-click any `.json` → "Open with" → choose "JSON Diver"
3. Tick "Always use this app to open .json files" to open them by double-click from then on

### Loading and saving files

- **Double-click** a `.json` and it opens in JSON Diver
- **Drag & drop** a file onto the window and it opens with the original path retained
- After editing, **Ctrl+S** (or the **Save** button) **overwrites the original file**
  (UTF-8, no BOM)
- If the app was started without a file, saving opens a destination picker
- The title bar shows the name of the open file

### Multiple windows

- Double-clicking another `.json` while the app is running opens it in a **new window**
  (everything stays in a single process)
- The **New Window** button or **Ctrl+N** opens an empty new window

### Other

- External links in the app (GitHub and so on) open in your default browser rather
  than inside the app

## About large JSON documents

- Containers with more than 50 children render only 50 items at first and load the
  rest as you scroll
- Documents tens of thousands of lines long stay responsive

---

*This document describes the features as of v0.4.0.*
