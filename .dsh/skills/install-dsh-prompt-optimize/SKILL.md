---
name: install-dsh-prompt-optimize
description: 一键安装 DSH 提示词优化（dsh-prompt-optimize）——DeepSeek Harness 的提示词优化插件（github.com/saibei404/dsh-prompt-optimize）。包含前置检查、安装命令、失败处置和安装后验证；也可用于升级到最新版。
whenToUse: 当用户想安装或更新「提示词优化」插件、想在 DSH Web 输入框旁加上「✦ 优化提示词」按钮、或安装后按钮不出现需要排错时使用。
metadata:
  plugin: dsh-prompt-optimize
  repository: https://github.com/saibei404/dsh-prompt-optimize
  default-profile: web
---

# 安装 dsh-prompt-optimize

把提示词优化插件装进一个 DSH profile：输入框右侧会出现 `✦ 优化提示词` 按钮，把草稿改写成清晰的提示词，可一键撤销。

## 0. 先跑一条命令

```powershell
powershell -NoProfile -File <this-skill-dir>/scripts/install.ps1
```

默认安装到 `web` profile。换 profile 用 `-Profile <name>`；想先看它会做什么，用 `-DryRun`。

脚本会依次做：前置检查 → 安装 → 写入校验 → 打印下一步。下面各节是它每一步在做什么，以及失败时怎么人工处理。

## 1. 前置检查

| 检查 | 命令 | 期望 |
|---|---|---|
| DSH 可用 | `dsh --version` | 输出版本号，且满足 `>=0.2.0-rc.2 <0.3.0` |
| profile 存在 | `Test-Path "$env:USERPROFILE\.dsh\profiles\web\package.json"` | `True`（没有就先 `dsh web` 启动一次让它初始化） |
| pnpm 可用 | `dsh plugin --profile web --help` 不会报 `pnpm was not found` | 无该提示（DSH 自带 pnpm 时通常无需单独装） |
| 能访问 GitHub | `git ls-remote https://github.com/saibei404/dsh-prompt-optimize` | 能列出 `refs/heads/main` |

任何一项不满足，先解决它再继续——安装命令对这些问题只会给出难懂的错误。

## 2. 安装命令

```powershell
dsh plugin --profile web add github:saibei404/dsh-prompt-optimize#main
```

- 安装器会自动把包写进该 profile 的 `dependencies`，并把 `dsh-prompt-optimize` 追加进 `dsh.profile.bundles`（该包自带 `dsh.bundle.patch`，前端按钮也由它提供）。
- 升级到最新版：把上面的 `add` 换成 `add` 同一条命令再跑一次，或 `dsh plugin --profile web update dsh-prompt-optimize`。

离线/内网环境改用本地目录：

```powershell
# 解压 zip 后，指向解压出来的目录（含 package.json 的那一层）
dsh plugin --profile web add C:\path\to\dsh-prompt-optimize
```

## 3. 重启

插件在 DSH 启动时组装，**必须重启 `dsh web` 进程**才生效：

```powershell
# 在运行 dsh web 的终端按 Ctrl+C，然后
dsh web
```

浏览器刷新 `http://127.0.0.1:3080`。客户端按钮的 JS 改动可以热更新，但插件本身（服务端路由）不行。

## 4. 安装成功验证

```powershell
$profile = Join-Path $env:USERPROFILE '.dsh\profiles\web'
# a. 依赖与 bundle 都已登记
Select-String -Path "$profile\package.json" -Pattern 'dsh-prompt-optimize'
# b. 包已落地
Test-Path "$profile\node_modules\dsh-prompt-optimize\index.js"
```

```powershell
# c. 接口存在（405 = 路由已注册，正是期望结果；404 = 没装好）
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:3080/api/dsh-prompt-optimize
```

d. 界面：输入框右侧、模型选择器左边出现 `✦ 优化提示词`；输入一段文字点它，草稿应被改写并变成 `↶ 撤销`。

## 5. 常见失败与处置

| 现象 | 原因 | 处置 |
|---|---|---|
| `pnpm was not found` | 环境里没有 pnpm | `corepack enable pnpm` 或安装 pnpm 后重试 |
| 卡住/超时、`Failed to connect to github.com:443` | 网络到 GitHub 不通 | 配置代理（`HTTP_PROXY`/`HTTPS_PROXY`）后重试；或走第 2 节的本地目录安装 |
| 安装时提示 git 依赖的 build script 被拦 | pnpm 默认阻止 `prepare` 构建 | 本插件无构建步骤，一般可忽略；若被拦，按提示把对应包加入 profile 的 `pnpm-workspace.yaml` → `allowBuilds` |
| `incompatible with dsh ...` | 版本不匹配 | 升级 DSH；确需强行安装时按提示执行 `dsh plugin --profile web allow-version dsh-prompt-optimize@<ver> --dsh-version <ver> --accept-risk`（需用户明确同意） |
| 重启后接口 404 | 没重启，或 `dsh.profile.bundles` 里没有它 | 重启；检查 `package.json` 的 `dsh.profile.bundles` 是否含 `dsh-prompt-optimize`，缺了手动补上 |
| 按钮出现但点击报 `cannot get required service "llm"` | 热重载残留失效路由 | 完整重启一次 `dsh web`（1.1.0+ 已用 `ctx.effect` 注册路由，不会再出现） |
| 点击后弹「余额不足」 | 所配 provider 的账户额度用完 | 换 provider/model，见插件 README 的配置表 |

## 6. 卸载

```powershell
dsh plugin --profile web remove dsh-prompt-optimize
```

然后重启 `dsh web`。
