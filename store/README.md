# Microsoft Store submission assets

Everything Partner Center asks for, ready to paste or upload.

| File | Partner Center field |
| --- | --- |
| `listing-ja.md` | ストア登録情報 (ja) — 説明 / アプリの機能 / 検索キーワード |
| `listing-en.md` | Store listing (en-US) — description / app features / search terms |
| `certification-notes.md` | 認定のメモ (Notes for certification) |
| `restricted-capability-runfulltrust.md` | 制限付き機能 (runFullTrust) の使用承認の申請理由 |
| `logo-300.png` | ストア ロゴ 300×300 |
| `screenshots/*.png` | スクリーンショット (PC) — 1366×768 |
| `trailer-thumbnail-1920x1080.png` | トレーラーのサムネイル (必須) |
| `hero-1920x1080.png` | 16:9 スーパーヒーローアート |
| （リポジトリ外） `work/JSON-Diver-trailer-v0.7.0.mp4` | トレーラー本体 — 大きいので git には入れていない |

Two languages are listed because a ja + en-US pair widens search coverage: the same
build serves both, only the listing text differs.

## Screenshots

| File | What it shows |
| --- | --- |
| `01-tree-view.png` | The sample document as a tree: type icons, child counts, depth bar, minimap |
| `02-depth-overview.png` | Collapsed to depth 2 — the whole document at a glance |
| `03-escaped-json-zoom.png` | Escaped JSON zoomed into its own window, with a further escaped value inside |
| `04-schema-validation.png` | JSON Schema validation: violating rows highlighted, ⚠ 3 badge in the toolbar |
| `05-insert-from-clipboard.png` | Inserting a node from the clipboard: the popup with its before/inside/after choice |
| `06-split-two-documents.png` | Split mode mid-drag: a node on its way from the left document into the right one |
| `07-raw-mode.png` | Raw mode — the JSON as editable text |

All seven are 1366×768 PNG, above the Store's minimum for PC screenshots.

**How they were produced, and what to check.** They were captured from the shipping
app at <https://json.kintoys.app> with the desktop shell's DOM applied — the topbar
hidden and the `Save` / `New Window` buttons added, exactly as `desktop.js` does at
runtime. The rendering is therefore identical to the Windows app, but these are not
captures of the installed `.msix`. If you would rather ship literal desktop captures,
take them from the installed app at 1366×768 or larger and replace the files; the
listing text does not depend on them.

The Split shot is taken mid-drag by dispatching the app's own `dragstart` / `dragover`
events, so the drop indicator and the receiving-pane outline are the real ones the app
renders — a plain mouse-down does not start an HTML5 drag in a headless browser.

The version badge in the sidebar reads `v0.7.0`. Re-capture when that number changes
so the screenshots do not advertise an older build:

```bash
node shots.mjs   # see the session scratchpad, or re-run the same Playwright steps
```

## Trailer

`work/JSON-Diver-trailer-v0.7.0.mp4` — 53.0s, 1920×1080, H.264 High / yuv420p, silent
AAC-LC stereo 48 kHz, closed GOP 12, moov atom first. Within every Store requirement.

Title to enter alongside it (max 255 chars):

```
JSON Diver — dive into JSON that wasn't written to be read
```

`trailer-thumbnail-1920x1080.png` is the required still, taken from the zoom scene.

`hero-1920x1080.png` is the 16:9 super hero art. The trailer only appears at the top
of the listing when this image is present. Store rules for it: no text, no app UI,
nothing important in the bottom third (a gradient may be laid over it), key detail
centred — hence the abstract composition rather than a screenshot.

Both the trailer and the hero art are generated, not hand-edited:
`work/record-trailer.mjs` drives the live app and bakes the captions in as DOM
overlays; `work/render-hero.mjs` renders the artwork as SVG. Re-run either after a
UI change.

## Before uploading

- Package identity must match Partner Center exactly — see `desktop/README.md`,
  section "Package identity". The values live in `%USERPROFILE%\.json-diver-msix.json`.
- `runFullTrust` is a restricted capability. Partner Center asks for a written
  justification before it will accept the submission; paste
  `restricted-capability-runfulltrust.md`. A shorter summary is also included in
  `certification-notes.md`.
- Privacy policy URL: <https://json.kintoys.app/privacy> (no `.html` — that path
  redirects). The page itself lives at `dev/privacy.html` and deploys with the site.
