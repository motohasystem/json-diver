# JSON Diver

JSON を階層ツリーで素早く読み・編集できるビューア／エディタです。
大きな JSON でも深い階層をたどりやすく、整形・スキーマ検証・ミニマップなどを備えています。

JSON Diver には **2 つの版** があります。

## 🌐 ブラウザ版

インストール不要。ブラウザですぐ使えます。

**▶ https://json.kintoys.app**

## 🖥️ ネイティブ版（Windows デスクトップ）

`.json` ファイルをダブルクリックで開ける、Tauri 2 製の Windows アプリです。

**▶ [最新版インストーラをダウンロード（Releases）](https://github.com/motohasystem/json-diver/releases/latest)**

`JSON Diver_<version>_x64-setup.exe` を実行してインストールしてください
（管理者権限不要 / current-user インストール）。

ネイティブ版ならではの機能:

- `.json` をダブルクリックで起動・読み込み（OS のファイル関連付け対応）
- 編集後 **Ctrl+S** で元ファイルへ上書き保存（UTF-8 / BOM なし）
- 別の `.json` をダブルクリック → **新しいウィンドウ** で開く（複数ウィンドウ対応）
- **New Window ボタン / Ctrl+N** で空の新規ウィンドウを開く

## 主な機能（共通）

- JSON を階層ツリーで表示し、深さごとに開閉
- View / Edit / Raw モード（生 JSON の直接編集）
- 整形（Format）・圧縮
- 値のインライン編集・コピー・ダウンロード
- JSON Schema による検証
- ミニマップでの俯瞰・ジャンプ

## リポジトリ構成

| パス | 内容 |
| --- | --- |
| [`dev/`](dev/) | フロントエンド本体（ブラウザ版・ネイティブ版で共有） |
| [`desktop/`](desktop/) | Windows ネイティブ版（Tauri 2）。ビルド手順は [`desktop/README.md`](desktop/README.md) |

ネイティブ版のビルド方法は [`desktop/README.md`](desktop/README.md) を参照してください。
