#!/bin/bash
# clausidian 安装验证脚本
# 用法: bash verify.sh

set -e -o pipefail

# 加载共享库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

VAULT="${OA_VAULT:-$HOME/obsidian-vault}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         clausidian 安装验证测试                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_cmd() {
    local name="$1"
    local cmd="$2"

    echo -n "测试: $name ... "

    if output=$(eval "$cmd" 2>&1); then
        log_success "通过"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "失败"
        echo "  错误: $output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# ============ 前置条件检查 ============
log_section "前置条件检查"

if ! check_obsidian_agent; then
    log_error "clausidian 命令不可用"
    echo "  请先运行: npm install -g clausidian"
    exit 1
fi

if [ ! -d "$VAULT" ]; then
    log_warn "Vault 目录不存在，创建测试库..."
    clausidian init "$VAULT" > /dev/null
fi

echo "  Vault: $VAULT"
echo ""

# ============ 基础命令测试 ============
log_section "基础命令测试"

test_cmd "stats — 统计信息" "clausidian stats --json"
test_cmd "health — 健康分数" "clausidian health --json"
test_cmd "list — 列出笔记" "clausidian list --json"
echo ""

# ============ 笔记操作测试 ============
log_section "笔记操作测试"

# 创建测试笔记
TEST_NOTE="test-note-$(date +%s)"
test_cmd "note create — 建立笔记" "clausidian note --title='$TEST_NOTE' --type=idea --summary='测试笔记' --json"

# 验证笔记存在
if [ -f "$VAULT/ideas/$TEST_NOTE.md" ]; then
    log_success "笔记文件已创建"
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # 读取笔记
    test_cmd "read — 读取笔记内容" "clausidian read --note='$TEST_NOTE' --json"

    # 更新笔记
    test_cmd "update — 更新元数据" "clausidian update --note='$TEST_NOTE' --tags=test,verify --json"

    # 删除测试笔记
    test_cmd "delete — 删除笔记" "clausidian delete --note='$TEST_NOTE' --json"
else
    log_error "笔记文件创建失败"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# ============ 日志操作测试 ============
log_section "日志操作测试"

TODAY=$(date +%Y-%m-%d)
test_cmd "journal — 日志操作" "clausidian journal --json"

if [ -f "$VAULT/journal/$TODAY.md" ]; then
    log_success "日志文件已创建"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_warn "日志文件未创建（可能已存在）"
fi
echo ""

# ============ 搜索测试 ============
log_section "搜索测试"

test_cmd "search — 关键词搜索" "clausidian search --keyword='test' --json" || true
test_cmd "recent — 最近更新" "clausidian recent --days=1 --json" || true
echo ""

# ============ 索引操作测试 ============
log_section "索引操作测试"

test_cmd "sync — 重建索引" "clausidian sync --json"
test_cmd "tag-list — 标签列表" "clausidian tag-list --json"
echo ""

# ============ 高级功能测试 ============
log_section "高级功能测试"

test_cmd "orphans — 孤岛笔记检测" "clausidian orphans --json" || true
test_cmd "broken-links — 坏链接检测" "clausidian broken-links --json" || true
test_cmd "graph — 知识图谱" "clausidian graph --json" || true
echo ""

# ============ 总结报告 ============
log_section "测试结果"

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
if [ "$TOTAL" -gt 0 ]; then
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL))
else
    SUCCESS_RATE=0
fi

echo "通过: $TESTS_PASSED/$TOTAL ($SUCCESS_RATE%)"
echo "失败: $TESTS_FAILED"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    log_success "所有测试通过！安装成功！"
    echo ""
    echo "下一步："
    echo "  1. 运行: clausidian setup $VAULT"
    echo "  2. 重启 Claude Code"
    echo "  3. 在任何项目目录试用: /obsidian 写日记"
    exit 0
else
    log_warn "部分测试失败，请检查错误信息"
    echo ""
    echo "故障排查："
    echo "  1. 运行诊断脚本: bash health.sh"
    echo "  2. 检查 vault 权限: ls -la $VAULT"
    echo "  3. 查看完整日志: clausidian serve --vault $VAULT --debug"
    exit 1
fi
