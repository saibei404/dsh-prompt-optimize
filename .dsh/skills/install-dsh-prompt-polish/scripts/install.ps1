<#
.SYNOPSIS
  一键安装 / 升级 DeepSeek Harness 提示词优化插件 dsh-prompt-polish。

.DESCRIPTION
  依次执行：前置检查 -> 安装 -> 安装结果校验 -> 打印重启与验证指引。
  默认安装到 web profile。任何一步失败都会给出可执行的处置建议。

.PARAMETER Profile
  目标 DSH profile 名，默认 web。

.PARAMETER DryRun
  只做检查并打印将要执行的命令，不安装、不修改任何文件。

.EXAMPLE
  powershell -NoProfile -File ./install.ps1

.EXAMPLE
  powershell -NoProfile -File ./install.ps1 -Profile web -DryRun
#>
[CmdletBinding()]
param(
  [string]$Profile = 'web',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/saibei404/dsh-prompt-polish'
$Package = 'dsh-prompt-polish'
$Spec = 'github:saibei404/dsh-prompt-polish#main'
$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$ProfileDir = Join-Path $DshHome (Join-Path 'profiles' $Profile)

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "  [ok]   $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  [warn] $text" -ForegroundColor Yellow }
function Die($text, $hint) {
  Write-Host "  [fail] $text" -ForegroundColor Red
  if ($hint) { Write-Host "         $hint" -ForegroundColor Yellow }
  exit 1
}

Write-Host "dsh-prompt-polish installer" -ForegroundColor White
Write-Host "  repo    : $RepoUrl"
Write-Host "  profile : $Profile"
Write-Host "  spec    : $Spec"
if ($DryRun) { Write-Host "  mode    : DRY RUN (no changes)" -ForegroundColor Yellow }

Step '1/4 前置检查'

$dshCommand = Get-Command dsh -ErrorAction SilentlyContinue
if (-not $dshCommand) {
  Die '找不到 dsh 命令。' '先把 DSH 的 bin 目录加入 PATH（能直接运行 `dsh --version`），再重试。'
}
$dshVersion = (& dsh --version 2>&1 | Select-Object -First 1).Trim()
Ok "dsh $dshVersion"

if ($dshVersion -match '^(\d+)\.(\d+)\.(\d+)') {
  $major = [int]$Matches[1]
  $minor = [int]$Matches[2]
  if (-not ($major -eq 0 -and $minor -eq 2)) {
    Warn "插件要求 dsh >=0.2.0-rc.2 <0.3.0，当前为 $dshVersion；安装器可能拒绝，必要时按提示使用 allow-version。"
  }
} else {
  Warn "无法解析 dsh 版本（$dshVersion），跳过版本范围检查。"
}

if (-not (Test-Path (Join-Path $ProfileDir 'package.json'))) {
  Die "profile '$Profile' 尚未初始化：$ProfileDir 下没有 package.json。" "先运行一次 ``dsh $Profile`` 让它初始化，再重跑本脚本。"
}
Ok "profile 目录 $ProfileDir"

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCommand) {
  foreach ($candidate in @("$env:ProgramFiles\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe", 'C:\Program Files\Git\cmd\git.exe')) {
    if (Test-Path $candidate) { $gitCommand = $candidate; break }
  }
}
if ($gitCommand) {
  $reachable = $false
  try { $ErrorActionPreference = 'Continue'; & $gitCommand ls-remote $RepoUrl 'refs/heads/main' 2>&1 | Out-Null; $reachable = ($LASTEXITCODE -eq 0) } catch { $reachable = $false } finally { $ErrorActionPreference = 'Stop' }
  if ($reachable) {
    Ok "GitHub 可达"
  } else {
    Warn "无法从本机读取 $RepoUrl。若安装卡住或超时，请先配置代理（HTTP_PROXY / HTTPS_PROXY），或改用本地目录安装。"
  }
} else {
  Warn '未检测到 git；从 GitHub 安装依赖 git，请先安装 git 或改用本地目录安装。'
}

Step '2/4 安装'
if ($DryRun) {
  Write-Host "  would run: dsh plugin --profile $Profile add $Spec" -ForegroundColor Yellow
} else {
  Write-Host "  dsh plugin --profile $Profile add $Spec"
  & dsh plugin --profile $Profile add $Spec
  if ($LASTEXITCODE -ne 0) {
    Die '安装命令返回失败。' "常见原因：网络到 GitHub 不通（配代理后重试）；profile 被占用（先退出 DSH）；包版本与当前 dsh 不兼容（按上方提示处理）。诊断日志路径见 dsh 输出。"
  }
  Ok '安装命令执行成功'
}

Step '3/4 校验安装结果'
if ($DryRun) {
  Write-Host '  跳过（dry run）' -ForegroundColor Yellow
} else {
  $manifestPath = Join-Path $ProfileDir 'package.json'
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.dependencies.PSObject.Properties.Name -contains $Package) {
    Ok "dependencies 已包含 $Package"
  } else {
    Warn "dependencies 中未找到 $Package —— 安装可能未完成。"
  }
  $bundles = @($manifest.dsh.profile.bundles)
  if ($bundles -contains $Package) {
    Ok "dsh.profile.bundles 已包含 $Package"
  } else {
    Warn "dsh.profile.bundles 缺少 $Package，插件不会被加载；请手动把 \"$Package\" 加进该数组。"
  }
  $entry = Join-Path $ProfileDir (Join-Path 'node_modules' (Join-Path $Package 'index.js'))
  if (Test-Path $entry) {
    Ok '包文件已落地'
  } else {
    Warn "未找到 $entry —— 包可能没装上。"
  }
}

Step '4/4 下一步'
Write-Host '  1) 重启 DSH Web 进程（插件在启动时组装，必须重启）：'
Write-Host '       在运行 dsh web 的终端按 Ctrl+C，然后重新执行 dsh web' -ForegroundColor White
Write-Host '  2) 浏览器刷新 http://127.0.0.1:3080'
Write-Host '  3) 验证：'
Write-Host '       curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3080/api/dsh-prompt-polish' -ForegroundColor White
Write-Host '       返回 405 表示路由已注册（正确）；404 表示插件没加载'
Write-Host '  4) 界面：输入框右侧、模型选择器左边出现「✦ 优化提示词」'
Write-Host ''
Write-Host '  卸载：' -ForegroundColor DarkGray
Write-Host "    dsh plugin --profile $Profile remove $Package" -ForegroundColor DarkGray

exit 0
