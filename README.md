# CinnaTool

This repository keeps two desktop implementations side by side:

- `electron/` - the existing Electron application, kept as the stable architecture.
- `tauri/` - a Tauri v2 port that reuses the renderer experience with a Tauri command bridge.

Common commands:

```bash
pnpm install
pnpm electron:build
pnpm electron:dist:win
pnpm electron:build:mac
pnpm tauri:frontend:build
pnpm tauri:dev
pnpm tauri:build
```

Tauri builds require the local Rust toolchain and platform prerequisites.
