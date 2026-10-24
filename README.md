# dsh-prompt-polish

DeepSeek Harness（DSH）的提示词优化插件：在输入框旁加一个 `✦ 优化提示词` 按钮，把草稿改写成清晰、具体、可执行的提示词，成功后才覆盖草稿，并可一键撤销。

A prompt-polishing plugin for DeepSeek Harness. One `✦ 优化提示词` button beside the model selector rewrites your draft into a clearer, more actionable prompt, replaces it only on success, and offers one-click undo.

## 功能 / Features

- **优化 / 撤销**：成功时替换草稿并变成 `↶ 撤销`；撤销前若草稿已被改动，不会覆盖新内容。
- **默认模型**：`deepseek-official` / `deepseek-flash`（DeepSeek V4.1 Flash），思维挡位 `low`。
- **可配置**：provider、model、reasoningEffort（`off` / `low` / `high` / `max`）、maxChars、maxTokens。
- **深浅色主题自适应**：所有颜色取自 Harness 设计令牌（`--dsw-alias-*`），浅色/深色互不干扰；令牌缺失时回退到系统色 `Canvas` / `CanvasText`。
- **无浮层打扰**：优化过程不显示任何悬浮提示，进度只体现在按钮文案（`优化中…`）；普通失败写到浏览器控制台。
- **余额不足弹窗**：额度/余额耗尽时（HTTP 402，`code: "INSUFFICIENT_BALANCE"`）弹出对话框说明原因；其余错误不弹窗。
- **带图片也能优化**：草稿里有图片或附件时按钮依然可用——只改写文字部分，图片与附件原样保留在消息里、不参与改写；带引用/命令标记的草稿仍会禁用（替换整段草稿会破坏这些锚点）。
- **不存储提示词**：草稿只发给配置的 provider，不做持久化。
- **路由随生命周期释放**：HTTP 路由通过 `ctx.effect` 注册，插件销毁时一并摘除，配置热重载不会残留失效路由。

## 安装 / Install

### 一键安装（推荐）

仓库内置了安装 skill：`.dsh/skills/install-dsh-prompt-polish/`。用 DSH 打开本仓库后，直接说「安装 dsh-prompt-polish」即可，或手动执行：

```powershell
powershell -NoProfile -File .dsh/skills/install-dsh-prompt-polish/scripts/install.ps1
```

脚本会做前置检查 → 安装 → 结果校验 → 打印重启与验证指引；`-DryRun` 只检查不安装，`-Profile <name>` 换 profile。

### 直接安装

```powershell
dsh plugin --profile web add github:saibei404/dsh-prompt-polish#main
```

安装后**重启 `dsh web`**。按钮出现在输入框右侧、模型选择器左边。

也可以从本地目录安装：

```powershell
dsh plugin --profile web add C:\path\to\dsh-prompt-polish
```

或手动加入 profile 的 `package.json` 依赖，并把它加进 `dsh.profile.bundles`：

```json
{
  "dependencies": { "dsh-prompt-polish": "file:./dsh-prompt-polish" },
  "dsh": { "profile": { "bundles": ["dsh-prompt-polish"] } }
}
```

## 配置 / Configuration

默认值写在插件里，可在 profile 的 `cordis.patch.yml` 中覆盖：

```yaml
- id: dsh-prompt-polish
  name: dsh-prompt-polish
  config:
    provider: deepseek-official
    model: deepseek-flash
    reasoningEffort: low
    maxChars: 12000
    maxTokens: 1600
```

| 字段 | 默认值 | 说明 |
|---|---|---|
| `provider` | `deepseek-official` | DSH LLM provider 名称 |
| `model` | `deepseek-flash` | 模型 ID（DeepSeek V4.1 Flash 的 ID 即 `deepseek-flash`） |
| `reasoningEffort` | `low` | 思维挡位：`off` / `low` / `high` / `max` |
| `maxChars` | `12000` | 草稿字符上限 |
| `maxTokens` | `1600` | 输出 token 上限 |

## 主题 / Theming

按钮与对话框只用 Harness 的设计令牌，深色模式会自动跟随：

| 用途 | 令牌 |
|---|---|
| 按钮背景 | `--dsw-alias-bg-layer-2` |
| 按钮文字 | `--dsw-alias-label-primary` |
| 边框 | `--dsw-alias-border-l2` |
| 悬停/按下 | `--dsw-alias-interactive-bg-hover` / `-active` |
| 对话框背景 | `--dsw-alias-bg-layer-1` |
| 主按钮 | `--dsw-alias-brand-primary` |

> 1.1.1 之前的版本用了自定义变量名（`--surface-color` 等）并带浅色兜底色值，那些变量在 Harness 里并不存在，于是深色模式下按钮一直是白底，看起来刺眼。现在改为真实令牌，兜底也换成随系统主题变化的 `Canvas` / `CanvasText`。

## 接口 / Endpoint

`POST /api/dsh-prompt-polish`

```jsonc
// request
{ "draft": "帮我写个周报" }

// 200
{ "optimized": "……" }

// 402 余额/额度不足
{ "error": "账户余额不足……", "code": "INSUFFICIENT_BALANCE" }

// 其他失败
{ "error": "……" }
```

## 兼容性 / Compatibility

- 目标运行时：`dsh >=0.2.0-rc.2 <0.3.0`
- 浏览器端注入槽位：`conversation.input.right`

## 许可 / License

未声明。使用前请与作者确认。
