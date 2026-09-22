# AI Browser Bridge for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/yamapan.copilot-browser-bridge-vscode?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=yamapan.copilot-browser-bridge-vscode)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/aktsmm/ai-browser-bridge-vscode?style=social)](https://github.com/aktsmm/ai-browser-bridge-vscode)

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

Or search for "AI Browser Bridge" in VS Code Extensions (`Ctrl+Shift+X`)

### Manual Installation

1. Download `.vsix` from [Releases](https://github.com/aktsmm/ai-browser-bridge-vscode/releases)
2. VS Code: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. Select the downloaded `.vsix` file

## 📋 Requirements

- **VS Code** 1.90.0 or higher
- **Chrome Extension**: [AI Browser Bridge](https://github.com/aktsmm/ai-browser-bridge)
- **GitHub Copilot** subscription, or **LM Studio** (Local LLM)

## 🎮 Usage

1. Launch VS Code (server starts automatically)
2. Open Chrome extension side panel
3. Enter questions or operation instructions on any web page

### Commands

- `AI Browser Bridge: Start Server` - Manually start the server
- `AI Browser Bridge: Stop Server` - Stop the server

## ⚙️ Settings

| Setting                                         | Default | Description                                                                                         |
| ----------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `copilotBrowserBridge.serverPort`               | 3210    | Local server port number                                                                            |
| `copilotBrowserBridge.autoStart`                | true    | Auto-start server on VS Code launch                                                                 |
| `copilotBrowserBridge.enableAgentTerminalTool`  | false   | Allow a small read-only subset of agent `run_terminal` commands                                     |
| `copilotBrowserBridge.enableCopilotCliFallback` | true    | Allow GitHub Copilot CLI fallback when VS Code model access is unavailable                          |
| `copilotBrowserBridge.allowedExtensionOrigins`  | []      | Additional allowed `chrome-extension://` origins (only enforced when an `Origin` header is present) |

### Bridge behavior

- `/capabilities` advertises `contextVersion: 1` and the verified `extension-dom` backend. Update/rebuild the Chrome extension and bridge together.
- Requests carry bounded global/profile/task instructions and a validated operation policy. Tools are exposed only when applicable; unexposed native calls are rejected. The Chrome client owns the browser execution loop: a native browser request ends the current model turn without reporting it as executed.
- Browser tasks do not expose terminal execution. Playwright CLI/MCP/CDP remain unconnected until an explicitly configured and verified adapter is available; installing Copilot does not grant the bridge all VS Code Chat tools.

### Optional CLI Development Probe

Repeated bridge starts share one startup operation; stopping during startup rejects the pending operation rather than leaving it unresolved. The same lifecycle checks apply to the standalone bridge.

Compatible-range dependency updates on 2026-09-22 remove the previous high/critical VS Code development findings. Two moderate Vitest/mocker development findings remain and require a major-version migration. Run finite tests against trusted fixtures only; do not expose test/UI servers to untrusted clients. Treat the full dependency audit as unresolved until that migration is tested.

The development dependency pins `@playwright/cli` to 0.1.21. Verify it with `node node_modules/@playwright/cli/playwright-cli.js --version`. It is not a bundled runtime executor and is not exposed to model requests.

Existing-browser attachment requires the official Playwright browser extension and explicit target selection. This CLI version automatically captures a snapshot during `attach`; never attach unattended to an unverified active tab. A successful connection does not establish that the intended tab/profile is selected. Use a dedicated test page, verify its identity before interaction, and detach only the session owned by the probe. The current Browser Bridge remains on its verified extension-DOM backend.

- The Chrome side can now save generated Markdown to a workspace-relative path through the VS Code bridge
- If workspace-relative save is requested without an open workspace, the Chrome extension falls back to browser downloads
- The Chrome side primary provider setting can choose Auto, VS Code Language Model API, or LM Studio
- Auto prioritizes VS Code Language Model API for both chat and browser-agent work. GitHub Copilot CLI is reserved for the last answer fallback. LM Studio is used only when explicitly selected
- The GitHub Copilot SDK route uses the Public Preview `@github/copilot-sdk` and is exposed only as an experimental/advanced fallback diagnostic; VS Code extension hosts can resolve `process.execPath` to Code/Electron instead of node, so SDK runtime availability is gated before use
- GitHub Copilot CLI can be used as a last-resort fallback response path when VS Code language model access is unavailable
- Copilot model selection is live-only: static fallback model IDs are not selectable when the bridge cannot return user-visible Copilot models
- LM Studio endpoints are restricted to localhost / loopback addresses for safety

### Request authorization model

- The server binds to `127.0.0.1` only and authorizes protected routes via the `X-Copilot-Bridge-Client: chrome-extension` header. A cross-site page cannot set this custom header without a CORS preflight, which only allowed extension origins pass.
- An `Origin` header is **not** required: Chrome omits it when the extension fetches a host it already holds `host_permissions` for (the local bridge), so requiring it would break the side panel. When an `Origin` header _is_ present, it must match the official store origin or one of `allowedExtensionOrigins`.

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

- **Data processing**: Requests, instructions, page text/URL/title and supplied attachments/images are processed and forwarded to the selected provider. No developer analytics or advertising telemetry is sent. Do not send information you do not intend that provider to receive.
- **Communication**: Only operates on localhost using the configured port (default: `localhost:3210`)
- **External Transmission**: Only sent to Copilot/Local LLM based on provider selection
- **Saved output**: Explicit file requests can write to the configured workspace; browser downloads are managed by the companion extension. Local LLM endpoints are loopback-only, but further forwarding by a local server depends on its configuration. Optional personal-profile storage belongs to the Chrome extension, not this bridge.

## 🔗 Related Projects

- [AI Browser Bridge (Chrome Extension)](https://github.com/aktsmm/ai-browser-bridge)

## 👤 Author

yamapan (https://github.com/aktsmm)
