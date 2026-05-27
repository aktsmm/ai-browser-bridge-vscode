# GitHub Copilot Browser Bridge for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/yamapan.copilot-browser-bridge-vscode?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=yamapan.copilot-browser-bridge-vscode)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/aktsmm/copilot-browser-bridge-vscode?style=social)](https://github.com/aktsmm/copilot-browser-bridge-vscode)

🔗 VS Code extension that bridges browser pages with LLM (GitHub Copilot / Local LLM) for analysis and interaction

[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yamapan.copilot-browser-bridge-vscode)

[Japanese / 日本語版はこちら](README_ja.md)

## License

CC BY-NC-SA 4.0 — see [LICENSE](LICENSE).

## 📥 Installation

### VS Code Marketplace

```bash
code --install-extension yamapan.copilot-browser-bridge-vscode
```

Or search for "GitHub Copilot Browser Bridge" in VS Code Extensions (`Ctrl+Shift+X`)

### Manual Installation

1. Download `.vsix` from [Releases](https://github.com/aktsmm/copilot-browser-bridge-vscode/releases)
2. VS Code: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. Select the downloaded `.vsix` file

## 📋 Requirements

- **VS Code** 1.90.0 or higher
- **Chrome Extension**: [GitHub Copilot Browser Bridge](https://github.com/aktsmm/copilot-browser-bridge)
- **GitHub Copilot** subscription, or **LM Studio** (Local LLM)

## 🎮 Usage

1. Launch VS Code (server starts automatically)
2. Open Chrome extension side panel
3. Enter questions or operation instructions on any web page

### Commands

- `GitHub Copilot Browser Bridge: Start Server` - Manually start the server
- `GitHub Copilot Browser Bridge: Stop Server` - Stop the server

## ⚙️ Settings

| Setting                                        | Default | Description                                      |
| ---------------------------------------------- | ------- | ------------------------------------------------ |
| `copilotBrowserBridge.serverPort`              | 3210    | Local server port number                         |
| `copilotBrowserBridge.autoStart`               | true    | Auto-start server on VS Code launch              |
| `copilotBrowserBridge.enableAgentTerminalTool` | false   | Allow a small read-only subset of agent `run_terminal` commands |
| `copilotBrowserBridge.enableCopilotCliFallback` | true   | Allow GitHub Copilot CLI fallback when VS Code model access is unavailable |
| `copilotBrowserBridge.allowedExtensionOrigins` | []      | Additional allowed `chrome-extension://` origins |

### Bridge behavior

- The Chrome side can now save generated Markdown to a workspace-relative path through the VS Code bridge
- If workspace-relative save is requested without an open workspace, the Chrome extension falls back to browser downloads
- GitHub Copilot CLI can be used as a fallback response path when VS Code language model access is unavailable
- LM Studio endpoints are restricted to localhost / loopback addresses for safety

## 🔧 Development

```bash
# Run unit tests
npm run test

# Build
npm run compile

# Watch mode
npm run watch

# Create VSIX package
npx @vscode/vsce package
```

## 📄 License

CC BY-NC-SA 4.0 © [aktsmm](https://github.com/aktsmm)

## 📑 Third-Party Notices

- [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)

## 🔒 Privacy

- **Data Collection**: None
- **Communication**: Only operates on localhost using the configured port (default: `localhost:3210`)
- **External Transmission**: Only sent to Copilot/Local LLM based on provider selection

## 🔗 Related Projects

- [GitHub Copilot Browser Bridge (Chrome Extension)](https://github.com/aktsmm/copilot-browser-bridge)

## 👤 Author

yamapan (https://github.com/aktsmm)
