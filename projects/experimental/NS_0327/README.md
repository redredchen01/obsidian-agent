# HR Admin Bot Package

4 個 Telegram Bot 組成的 HR 行政自動化工具包，統一經理器啟動，Google Sheets 作為數據層。

**版本：v0.4.0**

## Bot 清單

| Bot | 功能 | 流程 |
|-----|------|------|
| Onboarding | 新人入職 | 輸入ID → 確認資料 → 寫入Sheet → 通知HR |
| Work Permit | 工作證申請 | 輸入ID → 自動填入部門職位 → 提交 → 通知HR |
| Leave | 假期申請 | 輸入ID → 選假別 → 填日期原因 → 檢查餘額 → 提交 → 通知經理 |
| Offboarding | 離職流程 | 輸入ID → 自動生成申請 → 提交 → 通知HR+經理 |

## 安裝

```bash
pip install -e .
```

## 配置

1. 複製 `config.example.json` → `config.json`
2. 填入 4 個 Telegram Bot Token（透過 @BotFather 建立）
3. 填入 Google Sheet ID 和 Service Account 金鑰路徑
4. 填入 SMTP Email 設定
5. （選填）填入 Webhook URL 清單

## Google Sheet 結構

需要 1 個 Spreadsheet，包含 6 個 Worksheet：

| Worksheet | 用途 |
|-----------|------|
| employees | 員工名冊（ID、姓名、部門、職位、Email、主管Email） |
| onboarding | 入職記錄 |
| work_permits | 工作證申請記錄 |
| leaves | 請假記錄 |
| offboarding | 離職記錄 |
| audit_log | 操作稽核記錄（自動寫入） |

## Docker 部署

```bash
# 1. 複製環境變數範本
cp .env.example .env
# 2. 填入 .env 與 config.json、credentials.json
# 3. 啟動所有服務
docker-compose up -d

# 查看健康狀態
curl http://localhost:8080/
# 回應範例：{"healthy": true, "bots_running": 4, "uptime_seconds": 120}
```

## 健康檢查（Health Check）

服務啟動後會在 port 8080 提供 HTTP health check，適用於 Docker/k8s 存活探針：

```
GET http://localhost:8080/
→ 200 {"healthy": true, "bots_running": 4, "uptime_seconds": 300}
→ 503 (不健康時)
```

使用 `--health-port 0` 可停用：

```bash
hr-admin-bots serve --health-port 0
```

## CLI 指令

```bash
# 啟動所有 Telegram Bot
hr-admin-bots serve [--config config.json] [--no-scheduler] [--health-port 8080]

# 啟動 MCP Server（供 AI agent 使用）
hr-admin-bots mcp [--config config.json]

# 快速員工查詢
hr-admin-bots lookup <employee_id> [--config config.json]

# 查詢假別餘額
hr-admin-bots balance <employee_id> [--config config.json]

# 查詢待審申請狀態
hr-admin-bots status <employee_id> [--config config.json]

# 顯示版本
hr-admin-bots version
```

## 自動提醒排程器

`serve` 指令啟動後會同時啟動背景排程器（預設每 6 小時檢查一次）：

| 規則 | 觸發條件 | 通知對象 |
|------|---------|---------|
| 請假待審提醒 | 待審超過 48 小時 | 主管（email 或 Telegram） |
| 離職待處理提醒 | 待審超過 72 小時 | HR |
| 假期即將到期 | 已核准假期 3 天內結束 | 員工 |

停用排程器：`hr-admin-bots serve --no-scheduler`

## 操作稽核（Audit Trail）

所有 HR 操作自動寫入 Google Sheets 的 `audit_log` 工作表：

| 欄位 | 說明 |
|------|------|
| timestamp | 操作時間（ISO 8601） |
| action | 操作類型（leave_submit、leave_approve、telegram_bind 等） |
| actor | 執行者（Telegram user ID 或系統） |
| target_employee | 被操作的員工 ID |
| details | 額外說明 |

## MCP Server

MCP Server 讓 Claude Code、OpenClaw 等 AI agent 可以直接呼叫 HR 操作。

透過 stdin/stdout JSON-RPC 2.0 協定通訊，無須額外的 MCP 套件。

### 啟動

```bash
hr-admin-bots mcp --config config.json
# 或
python -m hr_admin_bots.mcp_server --config config.json
```

### 可用工具

| 工具 | 說明 |
|------|------|
| `hr_lookup_employee` | 依員工 ID 查詢員工資料 |
| `hr_check_leave_balance` | 查詢指定假別的剩餘天數 |
| `hr_apply_leave` | 提交請假申請 |
| `hr_approve_leave` | 核准或駁回請假申請 |
| `hr_list_pending` | 列出所有待審申請 |
| `hr_submit_onboarding` | 提交入職記錄 |
| `hr_submit_work_permit` | 提交工作證申請 |
| `hr_submit_offboarding` | 提交離職申請 |

## Leave Bot 指令

Leave Bot 支援以下 Telegram 指令：

| 指令 | 說明 |
|------|------|
| `/start` | 開始請假申請流程 |
| `/status` | 查看個人近期請假紀錄 |
| `/balance` | 查看各假別剩餘天數 |
| `/stats` | 顯示 HR 統計（本月申請數、狀態分布、平均審核時間） |
| `/cancel` | 取消當前操作 |

### Claude Code 整合範例（.mcp.json）

```json
{
  "mcpServers": {
    "hr-admin": {
      "command": "hr-admin-bots",
      "args": ["mcp", "--config", "/path/to/config.json"]
    }
  }
}
```

## Webhook 通知

在 `config.json` 加入 `webhooks` 陣列，即可在核准/駁回事件時自動 POST 通知：

```json
{
  "webhooks": [
    "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "https://YOUR_TEAM.webhook.office.com/webhookb2/..."
  ]
}
```

Payload 格式：

```json
{
  "event_type": "leave_approval",
  "data": {
    "action": "approve",
    "new_status": "approved",
    "row_index": 5
  }
}
```

## 假期類型

| 類型 | 額度 |
|------|------|
| 年假 | 依員工名冊設定 |
| 病假 | 無限制 |
| 事假 | 10天/年 |
| 喪假 | 3天 |
| 婚假 | 5天 |
| 產假 | 98天 |
| 陪產假 | 15天 |

## 技術棧

- Python 3.9+
- python-telegram-bot v20+ (async)
- gspread + google-auth
- smtplib / urllib.request (stdlib)
