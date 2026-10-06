# 認定のメモ（Notes for certification）

Partner Center の「認定のメモ」に貼り付ける内容です。審査担当者が英語話者の場合が
あるため、英語を先に、同じ内容の日本語を後に置いています。

---

## 貼り付け用テキスト

```
No account, sign-in, in-app purchase or network connection is required. The app is
fully functional offline.

HOW TO TEST (fastest path, no file needed)
1. Launch JSON Diver.
2. Click the "Sample" button in the toolbar. Demo JSON loads immediately and is
   shown as a tree. The sample deliberately contains a JSON string nested inside a
   value and a 137-item array, so every feature below can be exercised from it.
3. Click the orange "(escaped JSON - click to zoom)" link on the "payload" row. A
   window opens showing that escaped JSON as a full tree. Press Esc to close it.
4. Click the numbered buttons in the bar above the tree to expand/collapse the
   document by depth.
5. Switch the View / Edit / Raw / Split selector at the top right. In Edit mode,
   click any value to edit it inline; Ctrl+Z undoes it. In Raw mode the JSON is shown
   as text. Split is covered separately below.

HOW TO TEST FILE HANDLING
1. Save the following as sample.json anywhere:
   {"app":"json-diver","user":{"name":"Alice","roles":["admin","editor"]},
    "payload":"{\"eventId\":\"evt_123\",\"items\":[{\"sku\":\"A-1\",\"qty\":2}]}"}
2. Drag the file onto the JSON Diver window, or associate .json with the app and
   double-click it. The title bar shows the file name.
3. Edit any value, then press Ctrl+S. The original file is overwritten in place
   (UTF-8, no BOM). If the app was started without a file, Ctrl+S opens a standard
   save dialog instead.
4. Ctrl+N opens an empty second window. Opening another .json also opens a new
   window in the same process.

HOW TO TEST SPLIT (two documents, new in 0.7.0)
1. With a document loaded, press "Split" on the View / Edit / Raw / Split switch at
   the top right (or press the "s" key). The window divides into pane A (left, the
   document you already had) and pane B (right, empty).
2. Pane B shows a text editor because it is empty. Paste or type any JSON into it -
   for example {"env":"production","features":{"beta":false}} - then click anywhere
   outside the editor. Pane B renders it as its own tree.
3. Drag a node from pane A into pane B: press and hold the "⋮⋮" handle at the start
   of any row in pane A, drag it over a row in pane B, and release. Dropping on the
   top quarter of a row inserts before it, the middle puts it inside, the bottom
   quarter inserts after it. The node moves: it disappears from pane A and is
   highlighted where it landed in pane B.
4. Press Ctrl+Z once. Both panes return to their previous state together.
5. Dragging also works the other way, and within a single pane.

HOW TO TEST INSERTING FROM THE CLIPBOARD (new in 0.7.0)
1. Switch to Edit (or Split) mode and copy some JSON, e.g. {"sku":"A-1","qty":2}.
2. Hover any row and press the "+" button that appears on it. A popup shows what is
   on the clipboard and offers Before / Inside / After; inserting into an object asks
   for a key. Choose one and the node is inserted and highlighted.
3. Ctrl+Z undoes it.

ABOUT THE "Watch" BUTTON (clipboard)
The toolbar has a "Watch" toggle, OFF by default and off on first run. When the user
turns it on, the app watches the Windows clipboard so that JSON copied in any
application is loaded automatically. It only ever reads text, only while the user has
enabled it, and the contents are used solely to render the document on screen. Nothing
is stored outside the app and nothing is transmitted. To test: turn Watch on, copy
{"hello":"world"} from Notepad, and switch back - it is already loaded.

WHY runFullTrust IS DECLARED
JSON Diver is a packaged Win32 desktop application (Rust/Tauri with WebView2). Full
trust is required to (a) read and write the .json files the user opens or drops,
including saving back over the original path with Ctrl+S, (b) act as the handler for
the .json file type, and (c) read the clipboard for the optional Watch feature above.

NETWORK AND DATA
The app performs no network requests of its own: no telemetry, no analytics, no
accounts, no ads. The only outbound action is opening one of two links in the sidebar
("json.kintoys.app" and "GitHub") in the user's default browser, and only when the
user clicks them. Loaded JSON and an optional JSON Schema are kept in local WebView2
storage on the device so the session can be restored, and the "Clear" button removes
them.

SOURCE CODE
https://github.com/motohasystem/json-diver
```

---

## 日本語版（同内容 / 必要に応じて併記）

```
アカウント・サインイン・アプリ内課金・ネットワーク接続はいずれも不要です。
オフラインで全機能が動作します。

動作確認の手順（ファイル不要の最短経路）
1. JSON Diver を起動します。
2. ツールバーの「Sample」ボタンを押します。デモ用 JSON が即座に読み込まれ、ツリー
   表示されます。このサンプルには、値の中に文字列として埋め込まれた JSON と 137 件
   の配列が意図的に含まれており、以下の機能をすべてここから確認できます。
3. 「payload」行のオレンジ色のリンク「(escaped JSON - click to zoom)」をクリック
   します。エスケープされた JSON が完全なツリーとして別ウィンドウで開きます。
   Esc で閉じます。
4. ツリー上部のバーにある数字付きボタンで、深さごとに開閉できます。
5. 右上の View / Edit / Raw / Split を切り替えます。Edit では値をクリックして
   その場で編集でき、Ctrl+Z で取り消せます。Raw では JSON をテキストとして表示
   します。Split は後述の手順を参照してください。

ファイル操作の確認手順
1. 次の内容を sample.json として任意の場所に保存します。
   {"app":"json-diver","user":{"name":"Alice","roles":["admin","editor"]},
    "payload":"{\"eventId\":\"evt_123\",\"items\":[{\"sku\":\"A-1\",\"qty\":2}]}"}
2. JSON Diver のウィンドウにドラッグ＆ドロップするか、.json を本アプリに関連付けて
   ダブルクリックします。タイトルバーにファイル名が表示されます。
3. 任意の値を編集して Ctrl+S を押すと、元ファイルへ上書き保存されます
   （UTF-8 / BOM なし）。ファイルを開かずに起動した場合は、標準の保存ダイアログが
   表示されます。
4. Ctrl+N で空の新規ウィンドウが開きます。別の .json を開いた場合も、同一プロセス
   内に新しいウィンドウが開きます。

Split（2 画面編集、0.7.0 の新機能）の確認手順
1. 文書を読み込んだ状態で、右上の View / Edit / Raw / Split スイッチの「Split」を
   押します（「s」キーでも切り替わります）。画面がペイン A（左：それまでの文書）と
   ペイン B（右：空）に分かれます。
2. ペイン B は空なのでテキストエディタが表示されます。任意の JSON を貼り付けるか
   入力し（例: {"env":"production","features":{"beta":false}}）、エディタの外を
   クリックしてください。ペイン B が独立したツリーとして描画されます。
3. ペイン A のノードをペイン B へドラッグします。ペイン A の任意の行の先頭にある
   「⋮⋮」ハンドルを掴み、ペイン B の行の上まで運んで離してください。行の上端 1/4 に
   落とすと前に挿入、中央で中に入れる、下端 1/4 で後ろに挿入です。ノードは「移動」
   するので、ペイン A から消え、ペイン B の着地点がハイライトされます。
4. Ctrl+Z を 1 回押すと、両方のペインが同時に元の状態へ戻ります。
5. 逆方向（B → A）も、同一ペイン内の移動も同じ操作です。

クリップボードからの挿入（0.7.0 の新機能）の確認手順
1. Edit（または Split）モードにして、任意の JSON をコピーします
   （例: {"sku":"A-1","qty":2}）。
2. 任意の行にホバーすると現れる「+」ボタンを押します。クリップボードの内容と
   Before / Inside / After の選択肢がポップアップで出ます（オブジェクトへの挿入は
   キーを尋ねます）。いずれかを選ぶとノードが挿入され、ハイライトされます。
3. Ctrl+Z で取り消せます。

「Watch」ボタン（クリップボード）について
ツールバーの「Watch」トグルは既定で OFF、初回起動時も OFF です。ユーザーが ON に
した場合のみ、Windows のクリップボードを監視し、どのアプリでコピーされた JSON でも
自動的に読み込みます。読み取るのはテキストのみ、ユーザーが有効にしている間のみで、
内容は画面への描画にのみ使用します。アプリ外への保存も送信も行いません。確認方法:
Watch を ON にし、メモ帳などで {"hello":"world"} をコピーして戻ると読み込まれます。

runFullTrust を宣言している理由
JSON Diver はパッケージ化された Win32 デスクトップアプリ（Rust/Tauri + WebView2）
です。(a) ユーザーが開く・ドロップする .json の読み書き（Ctrl+S による元パスへの
上書き保存を含む）、(b) .json ファイルタイプのハンドラとしての動作、(c) 上記
Watch 機能でのクリップボード読み取り、のために完全信頼が必要です。

ネットワークとデータ
アプリ自身によるネットワーク通信は一切ありません（テレメトリ・解析・アカウント・
広告なし）。外部へ出る動作は、サイドバーの 2 つのリンク（json.kintoys.app と
GitHub）をユーザーがクリックしたときに既定のブラウザで開くことだけです。読み込んだ
JSON と任意の JSON Schema は、セッション復元のために端末内の WebView2 ローカル
ストレージに保存され、「Clear」ボタンで削除できます。

ソースコード
https://github.com/motohasystem/json-diver
```
