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

Two languages are listed because a ja + en-US pair widens search coverage: the same
build serves both, only the listing text differs.

## Screenshots

| File | What it shows |
| --- | --- |
| `01-tree-view.png` | The sample document as a tree: type icons, child counts, depth bar, minimap |
| `02-depth-overview.png` | Collapsed to depth 2 — the whole document at a glance |
| `03-escaped-json-zoom.png` | Escaped JSON zoomed into its own window, with a further escaped value inside |
| `04-schema-validation.png` | JSON Schema validation: violating rows highlighted, ⚠ 3 badge in the toolbar |
| `05-raw-mode.png` | Raw mode — the JSON as editable text |

All five are 1366×768 PNG, above the Store's minimum for PC screenshots.

**How they were produced, and what to check.** They were captured from the shipping
app at <https://json.kintoys.app> with the desktop shell's DOM applied — the topbar
hidden and the `Save` / `New Window` buttons added, exactly as `desktop.js` does at
runtime. The rendering is therefore identical to the Windows app, but these are not
captures of the installed `.msix`. If you would rather ship literal desktop captures,
take them from the installed app at 1366×768 or larger and replace the files; the
listing text does not depend on them.

The version badge in the sidebar reads `v0.5.0`. Re-capture when that number changes
so the screenshots do not advertise an older build:

```bash
node shots.mjs   # see the session scratchpad, or re-run the same Playwright steps
```

## Before uploading

- Package identity must match Partner Center exactly — see `desktop/README.md`,
  section "Package identity". The values live in `%USERPROFILE%\.json-diver-msix.json`.
- `runFullTrust` is a restricted capability. Partner Center asks for a written
  justification before it will accept the submission; paste
  `restricted-capability-runfulltrust.md`. A shorter summary is also included in
  `certification-notes.md`.
- Privacy policy URL: <https://json.kintoys.app/privacy> (no `.html` — that path
  redirects). The page itself lives at `dev/privacy.html` and deploys with the site.
