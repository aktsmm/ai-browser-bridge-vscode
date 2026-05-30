# GitHub Copilot Browser Bridge for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/yamapan.copilot-browser-bridge-vscode?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=yamapan.copilot-browser-bridge-vscode)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/aktsmm/copilot-browser-bridge-vscode?style=social)](https://github.com/aktsmm/copilot-browser-bridge-vscode)

🔗 Chrome拡張機能と連携して、ブラウザのページ内容をLLM（GitHub Copilot / ローカルLLM）で解析・対話するVS Code拡張機能

[VS Code Marketplace からインストール](https://marketplace.visualstudio.com/items?itemName=yamapan.copilot-browser-bridge-vscode)

[English version](README.md)

## ✨ 特徴

- **LLMルーティング**: GitHub Copilot または LM Studio（ローカルLLM）を選択可能
- **ストリーミング応答**: リアルタイムでLLMの応答を表示
- **自動起動**: VS Code起動時に自動でサーバーを開始
- **Vision対応**: スクリーンショットをLLMに送信して視覚的理解

## 📥 インストール

### VS Code Marketplace

```bash
code --install-extension yamapan.copilot-browser-bridge-vscode
```

または VS Code の拡張機能パネル (`Ctrl+Shift+X`) で「GitHub Copilot Browser Bridge」を検索

### 手動インストール

1. [Releases](https://github.com/aktsmm/copilot-browser-bridge-vscode/releases) から `.vsix` をダウンロード
2. VS Code: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. ダウンロードした `.vsix` を選択

## 📋 必要条件

- **VS Code** 1.90.0 以上
- **Chrome拡張機能**: [GitHub Copilot Browser Bridge](https://github.com/aktsmm/copilot-browser-bridge)
- **GitHub Copilot** サブスクリプション、または **LM Studio**（ローカルLLM）

## 🎮 使い方

1. VS Codeを起動（自動でサーバーが開始）
2. Chrome拡張機能のサイドパネルを開く
3. 任意のWebページで質問や操作指示を入力

### コマンド

- `GitHub Copilot Browser Bridge: Start Server` - サーバーを手動で開始
- `GitHub Copilot Browser Bridge: Stop Server` - サーバーを停止

## ⚙️ 設定

| 設定                                            | デフォルト | 説明                                                                                 |
| ----------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `copilotBrowserBridge.serverPort`               | 3210       | ローカルサーバーのポート番号                                                         |
| `copilotBrowserBridge.autoStart`                | true       | VS Code起動時に自動でサーバーを開始                                                  |
| `copilotBrowserBridge.enableAgentTerminalTool`  | false      | エージェントの `run_terminal` 実行を限定的な read-only コマンドに対してのみ許可      |
| `copilotBrowserBridge.enableCopilotCliFallback` | true       | VS Code のモデルアクセスが使えない場合に GitHub Copilot CLI fallback を許可          |
| `copilotBrowserBridge.allowedExtensionOrigins`  | []         | 追加で許可する `chrome-extension://` オリジン（`Origin` ヘッダーがある場合のみ適用） |

### Bridge の挙動

- Chrome 側で生成した Markdown を VS Code workspace 相対 path へ保存できるようになりました
- workspace 相対保存を要求しても workspace が未オープンなら、Chrome 拡張はブラウザのダウンロードへフォールバックします
- VS Code の language model access が使えない場合、GitHub Copilot CLI を fallback 応答経路として利用できます
- LM Studio の endpoint は安全のため localhost / loopback アドレスのみに制限されます

### リクエスト認可モデル

- サーバーは `127.0.0.1` のみで listen し、保護ルートは `X-Copilot-Bridge-Client: chrome-extension` ヘッダーで認可します。クロスサイトのページはこのカスタムヘッダーを CORS preflight なしに付与できず、preflight は許可された拡張オリジンのみ通過します。
- `Origin` ヘッダーは**必須ではありません**。Chrome は拡張が既に `host_permissions` を持つホスト（ローカル bridge）へ fetch する際 `Origin` を送らないため、必須化するとサイドパネルが壊れます。`Origin` ヘッダーが付く場合のみ、公式ストアオリジンか `allowedExtensionOrigins` のいずれかと一致する必要があります。

## 🔧 開発

```bash
# 単体テスト
npm run test

# ビルド
npm run compile

# ウォッチモード
npm run watch

# VSIXパッケージ作成
npx @vscode/vsce package
```

## 📄 ライセンス

CC BY-NC-SA 4.0 © [aktsmm](https://github.com/aktsmm)

## 📑 サードパーティ通知

- [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)

## 🔒 プライバシー

- **データ収集**: 行いません
- **通信**: 設定されたローカルホストのポートでのみ動作（既定値: `localhost:3210`）
- **外部送信**: LLMプロバイダー選択に応じてCopilot/ローカルLLMにのみ送信

## 🔗 関連プロジェクト

- [GitHub Copilot Browser Bridge (Chrome Extension)](https://github.com/aktsmm/copilot-browser-bridge)

## 👤 Author

yamapan (https://github.com/aktsmm)
