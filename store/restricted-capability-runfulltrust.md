# 制限付き機能の申請理由 — runFullTrust

Partner Center の「制限付き機能の使用の承認を要求する」欄に貼り付ける文面です。
審査担当者が英語話者の場合があるため英語を先に置いています。片方だけ求められた
場合は英語版を使ってください。

---

## 貼り付け用（English）

```
Capability: runFullTrust

WHAT THE APP IS
JSON Diver is a packaged Win32 desktop application — a native executable written in
Rust (Tauri 2) that hosts its user interface in WebView2. It is not a UWP app. The
manifest therefore declares the application entry point as
Windows.FullTrustApplication, and runFullTrust is the capability that Windows
requires for a packaged Win32 executable to run at all. Without it the app cannot
launch.

WHY THE APP NEEDS IT — the specific functionality
1. Opening the user's .json files. The app is a JSON viewer/editor. It reads files
   the user explicitly chooses: a file double-clicked in Explorer (through the
   windows.fileTypeAssociation extension declared in the manifest), a file dragged
   onto the window, or a file chosen in the save dialog. File access is performed with
   the standard Win32/Rust file APIs available to a full-trust process.
2. Saving in place over the original file. Pressing Ctrl+S overwrites the exact file
   the user opened, at its original path, as UTF-8 without a BOM. Preserving the
   user's path and encoding on save is the core workflow of an editor, and requires
   direct file system write access to that path.
3. Acting as the handler for the .json file type, receiving the file path as a
   command-line argument at launch, and opening additional files in additional
   windows within the same process.
4. Reading the clipboard for the optional "Watch" feature. The toolbar has a Watch
   toggle which is OFF by default and OFF on first run. Only while the user turns it
   on does the app observe the Windows clipboard (GetClipboardSequenceNumber, then a
   clipboard text read only when that number changes) so that JSON copied in another
   application is displayed automatically. It reads text only; the content is used
   solely to render the document on screen and is neither stored separately nor
   transmitted.
5. Opening external links in the user's default browser. The two links in the sidebar
   (the project website and its GitHub page) are handed to the shell rather than
   navigated to inside the app window.

WHAT THE APP DOES NOT DO
- No elevation. It installs and runs per-user and never requests administrator rights.
- No background service, scheduled task, driver, or process that keeps running after
  the window is closed.
- No scanning, enumerating or indexing of the file system. It touches only the files
  the user opens, drops or saves.
- No access to other applications' data, and no modification of system settings or of
  registry areas outside the package.
- No network requests of its own: no telemetry, no analytics, no accounts, no ads.
  Loaded JSON never leaves the device.

HOW TO VERIFY
Launch the app and click the "Sample" button: demo JSON loads with no file and no
network access. Then save any JSON as sample.json, drag it onto the window, edit a
value and press Ctrl+S to see the in-place save. For the clipboard feature, turn on
"Watch", copy {"hello":"world"} in Notepad and switch back — it is loaded
automatically. Turning Watch off stops all clipboard access.

The complete source code is public and auditable:
https://github.com/motohasystem/json-diver

Privacy policy: https://json.kintoys.app/privacy
```

---

## 日本語版（同内容 / 日本語で求められた場合）

```
機能: runFullTrust

アプリの構成
JSON Diver はパッケージ化された Win32 デスクトップアプリです。Rust（Tauri 2）で
書かれたネイティブ実行ファイルが、UI を WebView2 でホストしています。UWP アプリ
ではないため、マニフェストではエントリポイントを Windows.FullTrustApplication と
して宣言しており、runFullTrust はパッケージ化された Win32 実行ファイルが動作する
ために Windows が要求する機能です。これがないとアプリは起動できません。

必要とする具体的な機能
1. ユーザーの .json ファイルを開く。本アプリは JSON のビューア／エディタであり、
   ユーザーが明示的に選んだファイルを読み込みます（エクスプローラーでのダブル
   クリック＝マニフェストで宣言した windows.fileTypeAssociation 経由、ウィンドウ
   へのドラッグ＆ドロップ、保存ダイアログでの選択）。
2. 元ファイルへの上書き保存。Ctrl+S で、ユーザーが開いたファイルそのものを元の
   パスに UTF-8／BOM なしで上書きします。パスとエンコードを保ったまま保存すること
   はエディタの中核的な動作であり、そのパスへの直接的な書き込みが必要です。
3. .json ファイルタイプのハンドラとして動作し、起動時にコマンドライン引数として
   ファイルパスを受け取ること。追加のファイルは同一プロセス内の別ウィンドウで
   開きます。
4. 任意機能「Watch」のためのクリップボード読み取り。ツールバーの Watch トグルは
   既定で OFF、初回起動時も OFF です。ユーザーが ON にしている間だけ、Windows の
   クリップボードを監視し（GetClipboardSequenceNumber を確認し、番号が変化した
   ときのみテキストを読み取る）、他アプリでコピーされた JSON を自動的に表示します。
   読み取るのはテキストのみで、内容は画面への描画にのみ使用し、別途保存すること
   も送信することもありません。
5. 外部リンクを既定のブラウザで開くこと。サイドバーの 2 つのリンク（プロジェクト
   のウェブサイトと GitHub ページ）は、アプリ内で遷移せずシェルに渡します。

行わないこと
- 昇格を要求しません。ユーザー単位でインストール・実行され、管理者権限を求めません。
- バックグラウンドサービス、スケジュールされたタスク、ドライバー、ウィンドウを
  閉じた後も動作し続けるプロセスはありません。
- ファイルシステムの走査・列挙・索引付けは行いません。触れるのはユーザーが開く・
  ドロップする・保存するファイルだけです。
- 他アプリのデータへのアクセス、システム設定やパッケージ外のレジストリ領域の変更は
  行いません。
- アプリ自身によるネットワーク通信はありません（テレメトリ・解析・アカウント・
  広告なし）。読み込んだ JSON が端末外へ出ることはありません。

確認方法
アプリを起動して「Sample」ボタンを押すと、ファイルもネットワークも使わずにデモ
JSON が読み込まれます。次に任意の JSON を sample.json として保存し、ウィンドウに
ドラッグして値を編集し Ctrl+S を押すと、元ファイルへの上書き保存を確認できます。
クリップボード機能は、「Watch」を ON にしてメモ帳で {"hello":"world"} をコピーし、
アプリに戻ると自動的に読み込まれます。Watch を OFF にすればクリップボードへの
アクセスは一切行われません。

ソースコードはすべて公開されており、検証可能です:
https://github.com/motohasystem/json-diver

プライバシーポリシー: https://json.kintoys.app/privacy
```
