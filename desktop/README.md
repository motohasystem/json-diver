# JSON Diver — Desktop (Tauri 2 / Windows)

`.json` ファイルをダブルクリックで開ける、Windows 用デスクトップ版。
フロントは `../dev/` をそのまま再利用する（Tauri の `frontendDist` に直接指定）。

## 前提

- **Node.js**: 既にインストール済み（v24 系で確認）
- **Rust**: 未インストール。下記の手順で入れる必要あり

### Rust ツールチェインのインストール（初回のみ）

1. PowerShell を開いて以下を実行（rustup-init を入手して実行）:

   ```powershell
   winget install --id Rustlang.Rustup -e
   ```

   または公式インストーラを直接:
   <https://www.rust-lang.org/tools/install>

2. ターミナルを開き直してから動作確認:

   ```bash
   rustc --version
   cargo --version
   ```

3. **MSVC ビルドツール**（C++ Build Tools）も必要。
   未インストールの場合は Visual Studio Installer から
   「C++ によるデスクトップ開発」のワークロードを追加するか、
   下記コマンドで Build Tools 単体を入れる:

   ```powershell
   winget install --id Microsoft.VisualStudio.2022.BuildTools -e
   ```

## 開発・ビルド

```bash
cd desktop
npm install
npm run dev      # 開発起動（ホットリロードなし、フロントは静的）
npm run build    # NSIS インストーラを作成
```

ビルド成果物:
`desktop/src-tauri/target/release/bundle/nsis/JSON Diver_<version>_x64-setup.exe`

## `.json` の関連付け

1. 上記の NSIS インストーラを実行してインストール
2. 任意の `.json` を右クリック →「プログラムから開く」→「JSON Diver」
3. 「常にこのアプリで開く」をチェックすれば既定アプリになる

## 動作

- 起動時の `argv` から `.json` を 1 つ拾って読み込む
- 編集後 **Ctrl+S** で元ファイルに上書き保存（UTF-8 / BOM なし）
- 引数なしで起動した場合は **Save ボタン** または Ctrl+S で保存先を選択
- 起動中のアプリで別の `.json` をダブルクリック → 同一プロセス内に **新しいウィンドウ** が開いてそのファイルを表示
  （`tauri-plugin-single-instance` で 2 重起動を集約しつつ、ウィンドウは複数開ける）
- **New Window ボタン** または **Ctrl+N** で空の新規ウィンドウを開ける

## ファイル構成

```
desktop/
├── package.json
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/                  # favicon.svg から生成済み
    └── src/main.rs
```

ブラウザ単独で `../dev/index.html` を開いても従来通り動作する
（`desktop.js` は `window.__TAURI__` が無ければ no-op）。

## アイコンの再生成

`dev/favicon.svg` を更新したら:

```bash
cd desktop
npm run icon
```

これで `src-tauri/icons/` 一式が再生成される（要 Tauri CLI インストール済み）。
