# Microsoft Store listing — English (en-US)

Paste each block into the matching field in Partner Center.

---

## Product name

JSON Diver

## Short description (max 500 characters)

Read and edit JSON as a collapsible tree. Built for the JSON you did not write:
hundreds of lines deep, and with more JSON escaped as strings inside it.

---

## Description (max 10,000 characters)

JSON Diver is a viewer and editor for JSON that you have to read, not JSON you
carefully wrote yourself — API responses, export dumps, log payloads, config files
someone minified two years ago.

It renders any JSON as a collapsible tree, so structure is something you see rather
than something you reconstruct by counting brackets. Open and close by depth, jump
around with a minimap, and read strings that are themselves JSON without ever
decoding an escape by hand.

**Dive into escaped JSON**

The feature JSON Diver is named for. When a value is a JSON string — the
`"{\"key\":\"value\"}"` that every API seems to produce eventually — it is detected
automatically and marked. Hover to preview its structure; click to zoom into it in a
window of its own, rendered as a full tree. Escaped JSON nested inside escaped JSON
works too: the views stack, each labelled with its depth. No copy-pasting into an
unescaper, no losing your place.

**See the shape before the detail**

A bar above the tree gives you one button per depth, showing how many objects and
arrays live at that level. Open everything to depth 2 and take in the whole document
at a glance, then drill into the one branch you actually need. Hovering a collapsed
object shows a miniature of its contents without expanding it, and the minimap in the
sidebar turns the entire document into a colour-coded overview you can click to
navigate.

**Edit in place, or as text**

Three modes, one switch:

- **View** — read-only browsing, copying and zooming
- **Edit** — click a value to change it inline; drag a row by its handle to move a
  node before, inside or after another one
- **Raw** — the JSON as text, for when it is simply faster to type

Everything is undoable with Ctrl+Z, whichever mode you made the change in.

**Validate against a JSON Schema**

Paste a schema into the sidebar and the document is checked as you go. Violations are
highlighted in the tree with the reason on hover, a badge in the toolbar jumps to the
first problem, and in Edit mode a drag that would create new violations is blocked
before it lands. Supported keywords include type, const, enum, properties,
patternProperties, additionalProperties, required, items and prefixItems, minItems,
maxItems, oneOf, anyOf and internal $ref.

**Watch the clipboard**

Turn on Watch and JSON copied anywhere — your editor, a terminal, a browser — is
loaded automatically, with no window to switch to and nothing to paste. Only objects
and arrays are picked up, the same clipboard contents are never loaded twice, and
Ctrl+Z always brings back what was on screen before.

**Made for Windows**

- Double-click a `.json` file to open it, once you associate the type
- Ctrl+S writes straight back over the original file (UTF-8, no BOM)
- Another `.json` opens in a new window; Ctrl+N gives you an empty one
- Drag a file onto the window and it opens with its path intact, ready to save

**Large documents stay usable**

Containers with more than fifty children render the first fifty and fill in the rest
as you scroll, so a file with tens of thousands of lines opens and scrolls like a
small one.

**Your data stays on your machine**

No account, no sign-in, no telemetry, and nothing is uploaded anywhere. JSON Diver
works fully offline; what you load stays in local storage on this device until you
clear it. The only time it touches the network is when you click one of the two links
in the sidebar, which open in your default browser.

JSON Diver is open source. Source code, issues and release notes:
https://github.com/motohasystem/json-diver

---

## App features (max 20 items)

1. Renders JSON as a collapsible tree with per-type icons and child counts
2. Detects JSON escaped as a string and marks it automatically
3. Zooms into escaped JSON in its own window, rendered as a full tree
4. Handles escaped JSON nested inside escaped JSON, with a depth badge per level
5. One expand/collapse button per depth, showing how many containers are at each
6. Hover a collapsed object or array to preview its contents as a mini tree
7. Minimap of the whole document, colour-coded by type, click or drag to navigate
8. Inline editing of strings, numbers and booleans
9. Move nodes by drag and drop — insert before, move inside, or insert after
10. Undo and redo across every kind of edit (Ctrl+Z / Ctrl+Shift+Z)
11. Raw mode for editing the JSON directly as text
12. Pretty toggle: 2-space indentation or minified to one line, everywhere at once
13. Validates against a JSON Schema as you type, highlighting violations in the tree
14. Blocks drag-and-drop moves that would introduce new schema violations
15. Clipboard watch: JSON copied in any application is loaded automatically
16. Opens `.json` files on double-click once the file type is associated
17. Ctrl+S saves back over the original file as UTF-8 without a BOM
18. Opens each file in its own window; Ctrl+N for a new empty one
19. Copies any node — or the whole document — to the clipboard in one click
20. Works fully offline: no account, no telemetry, nothing leaves the device

---

## Search terms (max 7)

1. JSON viewer
2. JSON editor
3. JSON formatter
4. JSON Schema
5. tree view
6. developer tools
7. JSON beautifier

---

## Copyright and trademark info

© motohasystem

## Additional license terms

MIT
