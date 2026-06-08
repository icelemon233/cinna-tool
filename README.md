# CinnaTool

一个集成了 Todo 管理和 AI 多模型聊天的 Electron 桌面应用。

## 技术栈

- **Electron 42** — 跨平台桌面运行时
- **React 19** — UI 框架
- **TypeScript** — 类型安全
- **Vite** — 前端构建工具
- **Zustand** — 状态管理

## 功能

### 📝 Todo 管理
- 增删改查
- 优先级设置
- 筛选与排序
- 本地持久化存储

### 🤖 AI Chat
- 多模型支持
- 流式响应
- Markdown 渲染
- 多轮对话上下文

## 支持的 AI 模型

| 模型 | 提供商 |
|------|--------|
| GPT-4o | OpenAI |
| Claude | Anthropic |
| Gemini | Google |
| GLM-4 | 智谱 AI |
| Kimi | Moonshot |
| DeepSeek | DeepSeek |
| 通义千问 | 阿里云 |
| 自定义 OpenAI 兼容接口 | — |

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动后会同时运行 Vite 开发服务器（渲染进程）和 TypeScript 编译（主进程），并自动启动 Electron 窗口。

### 构建

```bash
# 编译 TypeScript + 构建前端
npm run build

# 打包为可分发安装包
npm run dist
```

## 项目结构

```
CinnaTool/
├── src/
│   ├── main.ts              # Electron 主进程入口
│   ├── preload.ts           # 预加载脚本（contextBridge）
│   ├── tray.ts              # 系统托盘
│   └── renderer/            # 渲染进程（React）
│       ├── index.html
│       ├── main.tsx         # React 入口
│       ├── App.tsx          # 根组件
│       ├── components/      # UI 组件
│       ├── stores/          # Zustand 状态管理
│       ├── services/        # AI 服务层
│       └── types/           # TypeScript 类型定义
├── dist/                    # 主进程编译输出
├── dist-renderer/           # 渲染进程构建输出
├── tsconfig.electron.json   # 主进程 TS 配置
├── tsconfig.json            # 渲染进程 TS 配置
├── vite.config.ts           # Vite 配置
├── electron-builder.yml     # 打包配置
└── package.json
```

## 环境变量

API Key 在应用内的设置面板中配置，无需额外环境变量文件。参见 `.env.example` 了解可选配置项。

## License

[MIT](./LICENSE)
