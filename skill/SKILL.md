---
name: obsidian
version: 1.0.0
description: |
  Obsidian 知识库管理 — 通过 MCP 工具操作 PARA 结构 vault。
  Use when: "记笔记", "写日记", "搜知识库", "记录想法", "obsidian",
  "vault", "journal", "capture", "search notes", "weekly review",
  "知识管理", "查笔记", "整理笔记", "回顾", "log work"
---

# /obsidian — Obsidian Vault 管理

通过 obsidian-agent MCP 工具操作知识库。从任何项目目录都能用。

## Setup

如果还没安装，运行 `obsidian-agent setup` 自动配置 MCP server + skill。

## Vault 基本信息

- **路径:** 由 `$OA_VAULT` 环境变量指定（运行 `obsidian-agent setup` 时配置）
- **结构:** PARA — `areas/` `projects/` `resources/` `journal/` `ideas/`
- **索引:** `_index.md` `_tags.md` `_graph.md`（自动维护）
- **规范:** 完整 frontmatter。`[[filename]]` 链接（无 .md）。小写连字符文件名。

## 触发关键词

| 语言 | 关键词 |
|------|--------|
| 中文 | 记笔记、写日记、搜知识库、记录想法、查笔记、整理笔记、回顾、周回顾、月回顾、知识管理、记一下、写入 vault、更新笔记、归档 |
| English | journal, capture, search notes, log work, weekly review, monthly review, vault stats, find notes, obsidian, knowledge base, read note |

## Intent → Tool 路由

根据用户意图选择正确的 MCP 工具：

| 意图 | MCP 工具 | 参数 |
|------|---------|------|
| 写日记 / 建日志 | `journal` | `{date?}` |
| 记录当前工作到日志 | `journal` → `patch` | 先建日志，再 append 到 Records |
| 记想法 / capture | `capture` | `{idea: "text"}` |
| 建新笔记 | `note` | `{title, type, tags?, summary?}` — type 未给时询问 |
| 读笔记内容 | `read` | `{note, section?}` |
| 搜索知识 | `search` | `{keyword, type?, tag?, status?}` |
| 列出笔记 | `list` | `{type?, tag?, status?, recent?}` |
| 最近更新 | `recent` | `{days?: 7}` |
| 更新 metadata | `update` | `{note, status?, tags?, summary?}` |
| 编辑段落 | `patch` | `{note, heading, append?/prepend?/replace?}` |
| 归档笔记 | `archive` | `{note}` |
| 删除笔记 | `delete` | `{note}` — 自动清理引用 |
| 反向链接 | `backlinks` | `{note}` |
| 孤岛笔记 | `orphans` | `{}` |
| 统计 | `stats` | `{}` |
| 健康检查 | `health` | `{}` |
| 知识图谱 | `graph` | `{type?}` — 输出 Mermaid |
| 重建索引 | `sync` | `{}` |
| 标签列表 | `tag_list` | `{}` |
| 重命名标签 | `tag_rename` | `{old_tag, new_tag}` |
| 打开笔记 (macOS) | `open` | `{note?, reveal?}` — 在 Obsidian.app 中打开 |
| 剪贴板速记 | `quicknote` | `{prefix?}` — 从剪贴板捕捉想法 |
| 周回顾 | **CLI:** `obsidian-agent review` | |
| 月回顾 | **CLI:** `obsidian-agent review monthly` | |
| 安装定时任务 | **CLI:** `obsidian-agent launchd install` | macOS LaunchAgent |
| 定时任务状态 | **CLI:** `obsidian-agent launchd status` | |

## 工作流模式

### 1. 记录今天工作

```
1. journal()                          — 确保今天的日志存在
2. patch({note: "YYYY-MM-DD",         — 追加工作记录到 Records
         heading: "Records",
         append: "- 完成了 XXX"})
```

### 2. 快速捕捉想法

```
1. capture({idea: "想法内容"})          — 建立 ideas/ 笔记
2. search({keyword: "相关词"})          — 查找关联笔记
3. 如果找到关联 → 建议用 update 互相链接
```

### 3. 每日总结

```
1. journal()                          — 确保日志存在
2. recent({days: 1})                  — 查看今天改了什么
3. patch(heading: "Records", append)  — 填入工作记录
4. patch(heading: "Tomorrow", append) — 填入明日计划
```

### 4. 周回顾

```
1. Bash: obsidian-agent review
2. list({type: "project", status: "active"})  — 活跃项目
3. recent({days: 7})                          — 本周更新
4. 读取生成的 review 并补充项目进展
```

### 5. 月回顾

```
1. Bash: obsidian-agent review monthly
2. stats()                             — vault 统计
3. list({type: "project"})             — 所有项目状态
4. 读取生成的 review 并补充里程碑
```

### 6. 查知识

```
1. search({keyword: "关键词"})          — 全文搜索
2. read({note: "最相关的结果"})          — 读取内容
3. backlinks({note: "该笔记"})          — 查看关联上下文
4. 综合笔记内容回答用户问题
```

### 7. 整理笔记 / 维护

```
1. health()                            — 健康分数
2. orphans()                           — 孤岛笔记
3. stats()                             — 统计概览
4. tag_list()                          — 标签检查
5. 建议: 链接孤岛、更新过期笔记、合并重复标签
```

## 写作规范

1. **Frontmatter 必填:** title, type, tags, created, updated, status, summary
2. **Type:** area / project / resource / journal / idea
3. **文件名:** 小写连字符 (`my-note.md`)，journal 用 `YYYY-MM-DD.md`
4. **链接:** `[[filename]]` 不加 `.md` 后缀
5. **修改后:** 更新 `updated` 字段，call `sync` 重建索引
6. **Related:** 主动维护双向链接

## macOS 增强

- **打开笔记:** `open({note: "my-note"})` → 在 Obsidian.app 中打开
- **剪贴板速记:** `quicknote()` → 从剪贴板内容创建 idea 笔记
- **搜索复制:** CLI `obsidian-agent search "关键词" --copy` → 结果进剪贴板
- **定时维护:** `obsidian-agent launchd install` → 自动每日建日志 + 每周回顾
- **系统通知:** hook 事件自动发送 macOS 通知中心提醒

## CLI Fallback

MCP 不支持的命令用 Bash（OA_VAULT 已通过 setup 配置）：

```bash
obsidian-agent review                # 周回顾
obsidian-agent review monthly        # 月回顾
obsidian-agent hook daily-backfill   # 从 git 历史建日志
obsidian-agent launchd install       # 安装 macOS 定时任务
obsidian-agent launchd status        # 查看定时任务状态
obsidian-agent open my-note          # 在 Obsidian.app 打开
obsidian-agent quicknote             # 从剪贴板速记
obsidian-agent search "API" --copy   # 搜索结果复制到剪贴板
```
