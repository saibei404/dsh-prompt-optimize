# dsh-prompt-polish

DeepSeek Harness（DSH）的提示词优化插件：在输入框旁加一个 `✦ 优化提示词` 按钮，把草稿改写成清晰、具体、可执行的提示词，成功后才覆盖草稿，并可一键撤销。

A prompt-polishing plugin for DeepSeek Harness. One `✦ 优化提示词` button beside the model selector rewrites your draft into a clearer, more actionable prompt, replaces it only on success, and offers one-click undo.

## 功能 / Features

- **优化 / 撤销**：成功时替换草稿并变成 `↶ 撤销`；撤销前若草稿已被改动，不会覆盖新内容。
- **默认模型**：`deepseek-official` / `deepseek-flash`（DeepSeek V4.1 Flash），思维挡位 `low`。
- **可配置**：provider、model、reasoningEffort（`off` / `low` / `high` / `max`）、maxChars、maxTokens。
- **无浮层打扰**：优化过程不显示任何悬浮提示，进度只体现在按钮文案（`优化中…`）；普通失败写到浏览器控制台。
- **余额不足弹窗**：额度/余额耗尽时（HTTP 402，`code: "INSUFFICIENT_BALANCE"`）弹出对话框说明原因；其余错误不弹窗。
- **不存储提示词**：草稿只发给配置的 provider，不做持久化。
- **谨慎禁用**：草稿含附件、引用或命令标记时按钮禁用，避免破坏这些结构。
- **路由随生命周期释放**：HTTP 路由通过 `ctx.effect` 注册，插件销毁时一并摘除，配置热重载不会残留失效路由。

## 安装 / Install

作为 CLI 管理的 profile 插件安装（在包含本包的目录下）：

```powershell
dsh plugin --profile web add .\dsh-prompt-polish
```

安装后重启 DSH。按钮出现在输入框右侧、模型选择器左边。

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
