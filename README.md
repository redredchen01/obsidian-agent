# session-wrap

**AI 對話記憶持久化工具** — 自動保存專案上下文，下次對話無縫接續。

A universal AI coding agent skill that automatically persists project context to memory files at session end.

---

## 這是什麼？/ What is this?

每次跟 AI 編碼助手（Claude Code、Cursor、Windsurf 等）開新對話，你都要重新解釋「我們做到哪了」。這個 skill 解決這個問題：

**對話結束時說一句「收工」，AI 自動掃描專案狀態、整理記憶、寫入持久化檔案。下次開新對話，AI 自動載入上下文，直接繼續工作。**

> Every time you start a new chat with an AI coding assistant, you waste time explaining context. This skill fixes that — say "wrap up" and it auto-persists your project state for the next session.

---

## 快速開始 / Quick Start

### 安裝 / Install

```bash
git clone https://github.com/redredchen01/session-wrap-skill.git
```

**Claude Code 用戶：**
```bash
cp -r session-wrap-skill/SKILL.md ~/.claude/skills/session-wrap/SKILL.md
```

**Cursor 用戶：**
```bash
mkdir -p .cursor/skills
cp session-wrap-skill/SKILL.md .cursor/skills/session-wrap.md
```

**其他 Agent：** 把 `SKILL.md` 的內容加入你的 agent 系統提示詞或規則檔中。

### 使用 / Usage

對話結束時，用任何語言說「結束」：

```
你：收工
你：wrap up
你：先到這，下次繼續
你：done for now
你：今日はここまで
```

AI 會自動執行：

```
記憶已更新：

| 檔案 | 動作 | 內容 |
|------|------|------|
| project_myapp.md | 更新 | v2.1 完成，auth 重構進行中 |
| feedback_testing.md | 新增 | 整合測試要用 real DB |
| user_preferences.md | 不變 | — |

下次開新對話會自動載入這些上下文。
```

---

## 運作原理 / How it works

```
觸發（「收工」）
    │
    ▼
┌─────────────────────┐
│  Step 1: 掃描狀態    │  git log, git status, 現有記憶檔
│  Step 2: 分析分類    │  哪些是新的、哪些要更新、哪些不變
│  Step 3: 寫入記憶    │  project / feedback / user / reference
│  Step 4: 更新索引    │  MEMORY.md
│  Step 5: 回報摘要    │  表格確認
└─────────────────────┘
    │
    ▼
下次對話自動載入 → 無縫接續
```

### 記憶分四類

| 類型 | 存什麼 | 範例 |
|------|--------|------|
| **project** | 專案狀態、版本、進度、分支 | 「v2.1 已發布，auth 重構在 feat/auth 分支進行中」 |
| **feedback** | 踩過的坑、學到的教訓 | 「整合測試別用 mock DB，上次因此漏掉 migration bug」 |
| **user** | 使用者偏好、工作風格 | 「偏好 TDD、要精簡回覆、用 vim」 |
| **reference** | 外部資源、URL、工具 | 「API 文件在 internal.company.com/api」 |

### 記憶檔案格式

每個檔案用 YAML frontmatter 標記，方便任何 agent 解析：

```markdown
---
name: MyApp 專案狀態
description: v2.1 已發布，auth 重構進行中
type: project
updated: 2026-03-25
---

## MyApp v2.1

**Repo**: https://github.com/user/myapp
**Branch**: feat/auth (from main)
**Status**: auth 模組重構中，JWT → session-based

### 已完成
- API v2 endpoint 全部遷移
- 測試覆蓋率 85%

### 待做
- session store 選型（Redis vs DB）
- 前端 token 處理遷移
```

### 索引檔 MEMORY.md

一個簡單的連結清單，指向所有記憶檔案：

```markdown
# Memory Index

## Project
- [MyApp 狀態](project_myapp.md) — v2.1 已發布，auth 重構中

## Feedback
- [測試經驗](feedback_testing.md) — 整合測試用 real DB

## User
- [偏好設定](user_preferences.md) — TDD、精簡回覆
```

---

## 不會保存什麼 / What it WON'T save

這個 skill 刻意不保存以下內容：

| 不保存 | 原因 |
|--------|------|
| 程式碼片段 | 會過時。改存檔案路徑 + 行號 |
| Git 歷史 | 用 `git log` 就有了 |
| 任務清單 | 屬於當次 session，不跨對話 |
| 暫存檔路徑 | 短暫存在，下次就沒了 |
| 程式架構/API 簽名 | 直接讀 code 就有，不需要記憶 |
| Debug 過程 | 短暫操作，解決就結束了 |

**原則**：只保存「code 裡讀不出來、但下次對話需要知道」的上下文。

---

## 支援平台 / Supported Platforms

| 平台 | 記憶存放位置 | 安裝方式 |
|------|-------------|----------|
| **Claude Code** | `~/.claude/projects/<hash>/memory/` | 複製到 `~/.claude/skills/session-wrap/` |
| **Cursor** | `.cursor/memory/` (專案根目錄) | 加入 `.cursor/skills/` 或 rules |
| **Windsurf** | `.windsurf/memory/` (專案根目錄) | 加入 windsurf rules |
| **其他 Agent** | `.ai-memory/` (專案根目錄) | 加入系統提示詞 |

Skill 會自動偵測當前平台，選擇正確的記憶路徑。

---

## 進階用法 / Advanced Usage

### 手動觸發特定類型

```
你：幫我記下這個教訓：API rate limit 要在 gateway 層處理，不要在每個 service 裡各自處理
```

AI 會只寫入一條 feedback 記憶，不做完整 session wrap。

### 跨專案共享

如果你有跨專案通用的偏好（如 coding style、溝通風格），可以手動把 `user_*.md` 複製到全域記憶路徑：

```bash
# Claude Code 全域記憶
cp user_preferences.md ~/.claude/memory/
```

### 配合 .claude/CLAUDE.md

在 CLAUDE.md 加一行，確保每次 session 都能觸發：

```markdown
# 結束對話時自動執行 session-wrap skill 保存上下文
```

---

## 常見問題 / FAQ

### Q: 記憶檔案會越來越多嗎？

不會。Skill 的規則是「更新優先於新建」——如果已有同主題的記憶檔，會更新而非新建。典型專案保持 3-5 個記憶檔。

### Q: 敏感資訊會被存到記憶嗎？

不會存 secrets、密碼、API key。記憶內容是高層次的專案狀態摘要，不包含敏感資料。但建議把記憶目錄加入 `.gitignore`。

### Q: 不用 git 的專案能用嗎？

能。沒有 git 時，skill 會改用目錄結構和檔案修改時間來判斷專案狀態。

### Q: 跟 Claude Code 內建的 auto memory 有什麼差別？

Claude Code 的 auto memory 是被動的——Claude 自己決定要不要記。這個 skill 是主動的——你說「收工」就執行完整的狀態掃描和結構化記憶寫入，確保不漏掉重要上下文。

---

## 開發 / Contributing

```bash
git clone https://github.com/redredchen01/session-wrap-skill.git
cd session-wrap-skill
# 修改 SKILL.md
# 測試：複製到 ~/.claude/skills/session-wrap/ 後在 Claude Code 中測試
```

歡迎 PR。改進方向：

- 更多平台支援（Copilot、Codex 等）
- 記憶壓縮/合併（長期記憶自動精簡）
- 記憶衝突解決策略
- 視覺化記憶圖譜

## License

MIT
