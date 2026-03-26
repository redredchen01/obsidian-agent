# 🎯 YD 2026 Projects Info

## 快速導覽

| P | 項目 | 別名 | 狀態 | 規模 | 用途 |
|---|------|------|------|------|------|
| **1** | YDAPI 核心 | `p1`/`dev1`/`test1` | 🟢 Active | 核心 | 主實現 |
| **2** | YDAPI 測試 | `p2`/`dev2`/`test2` | 🟢 Active | 137M | 集成測試 |
| **3** | APEX 工具 | `p3`/`dev3`/`test3` | 🟢 Active | 25 commits | 水印移除 |

---

## P1: YDAPI 核心實現

**路徑：** `projects/production/dexapi/`

**快速開始：**
```bash
p1                    # 進入項目
dev1                  # npm install + npm run dev
test1                 # npm test
build1                # npm run build
```

**核心模塊：** `sub2api/` (核心邏輯)
**技術棧：** Node.js + TypeScript
**測試：** Jest (tests/)
**狀態：** 🟢 Active (主開發項目)

---

## P2: YDAPI 測試環境

**路徑：** `projects/production/test-ydapi/`

**快速開始：**
```bash
p2                    # 進入項目
dev2                  # npm install + npm run dev
test2                 # npm test
```

**規模：** 3264 files, 137M
**用途：** P1 集成測試與驗證
**數據集：** fixtures/
**狀態：** 🟢 Active

---

## P3: APEX 工具（水印移除）

**路徑：** `projects/production/watermark-0324/`

**快速開始：**
```bash
p3                    # 進入項目
dev3                  # npm install + npm run dev
test3                 # npm test
build3                # npm run build
```

**功能：** 圖像水印自動移除
**技術：** Python/ML + Web UI
**提交：** 25 commits
**狀態：** 🟢 Active

---

## 統一開發流程

**所有項目都支持：**
```bash
npm install          # 安裝依賴 (所有項目)
npm run dev          # 開發模式
npm test             # 運行測試
npm run build        # 生成產物（如適用）
```

**使用別名（需激活）：**
```bash
source ~/.zshrc-workspace   # 一次性激活

dev1/dev2/dev3       # 快速啟動開發
test1/test2/test3    # 運行測試
build1/build2/build3 # 構建產物
```

---

## 狀態檢查

```bash
yd-status            # 查看所有項目改動
yd-info              # 顯示本文件
yd-kb-list           # 列出知識庫
yd-kb-search <keyword>  # 搜尋知識庫
```

---

## Git 工作流

```bash
yd-status            # 查看改動
yd-sync              # Stage 改動並顯示狀態
git commit -m "scope: description"
git push
```

---

**激活工作流：** `source ~/.zshrc-workspace`
**完整文檔：** 見 `CLAUDE.md`
**最後更新：** 2026-03-26 (增強版 v2)
