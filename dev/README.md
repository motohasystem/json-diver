# JSON Diver

An analysis tool that shows the shape of a JSON tree at a glance: paste or drop
some JSON and browse it. Vanilla JS + HTML/CSS, standalone, no build step.

## Usage

Just open `index.html` in a browser.

- **Input**: paste, drag & drop, or type straight into the Raw editor
- **Sample** button: load a demo containing escaped JSON and a large array
- **Clear** button: clear the input and the stored copy
- The input is saved to `localStorage` and restored on reload

## Features

### Tree rendering
- Per-type icons (`{}` `[]` 🔤 🔢 ☑ ⭕ 🪆) with a legend
- Primitive values are shown inline (long strings truncated, full text on hover)
- Objects/arrays also show their child count as `{N}` / `[N]`
- Fully expanded initially
- Hovering a row reveals `▾▾` / `▸▸` buttons that toggle sibling nodes together
  - The layout shift is corrected with a smooth scroll on click, so the row you
    clicked returns to the cursor
- Hovering a collapsed container shows a mini tree of its contents in a tooltip

### Text form (Pretty toggle)
- One sticky toggle decides how JSON text is written everywhere: the Raw editor,
  the hidden `#input` mirror behind Copy/Download, and anything arriving by paste
  or text drop
  - ON (default) … 2-space pretty print
  - OFF … minified to one line
- Flipping it re-serializes the current document and any open Raw editor in place
- Pasting into a Raw editor re-serializes the whole resulting text when it parses
  as JSON; a fragment pasted mid-document falls through to the native paste
- The preference is stored in `localStorage` (`json-diver:autoFormat`)

### Clipboard watch (Watch toggle)
- Off by default; the preference is stored in `localStorage` (`json-diver:watchClipboard`)
- Browser: the `clipboardchange` event (Chromium 144+) with a `focus` /
  `visibilitychange` fallback, both gated on the `clipboard-read` permission. Reads are
  skipped unless `document.hasFocus()`, since `readText()` rejects without focus
- Desktop: `desktop.js` forwards the toggle to the Tauri shell, which watches the
  Windows clipboard natively and emits `clipboard-text`; no focus needed
- Both paths land in `handleClipboardText()`, which ignores non-JSON, scalars,
  already-seen text and anything this app copied itself, then loads via
  `History.pushBefore()` so Ctrl+Z undoes it

### Escaped JSON (🪆)
- When a value is a JSON string (starts with `{` / `[` and parses), it is detected
  automatically and marked with the 🪆 icon
- Hover for a preview of the inner structure
- Click to zoom into a modal (the contents are re-rendered at full size)
- Nesting is supported (modals stack up and show a `depth N` badge)
- Esc or a backdrop click closes one level at a time

### Minimap
- A miniature of the whole tree in the right sidebar
- Colored bars per type, reflecting each row's actual rendered width
- A translucent viewport indicator marks the range currently on screen
- Click/drag to scroll straight to that position
- Modals get their own independent minimap

### Performance
- Containers with more than 50 children render only the first 50 initially
- The rest is appended as you scroll, via IntersectionObserver
- Minimap redraws are debounced with MutationObserver + requestAnimationFrame

## Files

| File | Role |
|---|---|
| `index.html` | Entry point, layout |
| `style.css` | Dark theme styling |
| `app.js` | Parsing, rendering, tooltips, modals, minimap |

## Implementation notes

- **Escaped-JSON detection**: `JSON.parse` is attempted only for strings that start
  with `{` or `[` after trimming (explicit-marker approach)
- **`findScroller`**: decides whether an element scrolls vertically via
  `scrollHeight - clientHeight > 1` (avoids side effects from `overflow-x: auto`)
- **Smooth scrolling**: implemented by hand with RAF + ease-out cubic, so it does
  not depend on browser behavior

## License

Unspecified (internal experiment)
