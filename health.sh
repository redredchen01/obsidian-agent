#!/bin/bash
# clausidian 环境诊断脚本
# 用法: bash health.sh

set -e -o pipefail

# 加载共享库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

VAULT="${OA_VAULT:-$HOME/obsidian-vault}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          clausidian 环境诊断工具                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

FAILED=0
WARNINGS=0
TOTAL_CHECKS=0
PASSED_CHECKS=0

# ============ 环境检查 ============
log_section "1. 环境检查"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "检查: Node.js 已安装 ... "
if check_nodejs; then
    log_success "通过"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "  Node.js 版本: $(get_nodejs_version)"
else
    log_error "失败"
    FAILED=$((FAILED + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "检查: npm 已安装 ... "
if check_npm; then
    log_success "通过"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log_error "失败"
    FAILED=$((FAILED + 1))
fi
echo ""

# ============ clausidian 检查 ============
log_section "2. clausidian 安装"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "检查: clausidian 命令可用 ... "
if check_obsidian_agent; then
    log_success "通过"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "  版本: $(get_obsidian_agent_version)"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "检查: clausidian init 可用 ... "
    if clausidian init --help > /dev/null 2>&1; then
        log_warn "警告"
        WARNINGS=$((WARNINGS + 1))
    else
        log_error "失败"
        FAILED=$((FAILED + 1))
    fi
else
    log_error "失败"
    FAILED=$((FAILED + 1))
fi
echo ""

# ============ Vault 检查 ============
echo -e "${BLUE}=== 3. Vault 配置 ===${NC}"
echo "  Vault 路径: $VAULT"

if [ -d "$VAULT" ]; then
    echo -e "  ${GREEN}✓${NC} Vault 目录存在"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))

    # 检查必要文件
    if [ -f "$VAULT/AGENT.md" ]; then
        echo -e "  ${GREEN}✓${NC} AGENT.md 存在"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} AGENT.md 缺失（可能未初始化）"
        WARNINGS=$((WARNINGS + 1))
    fi

    if [ -f "$VAULT/_index.md" ]; then
        echo -e "  ${GREEN}✓${NC} _index.md 存在"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} _index.md 缺失"
        WARNINGS=$((WARNINGS + 1))
    fi

    # 检查目录结构
    for dir in areas projects resources journal ideas templates; do
        if [ -d "$VAULT/$dir" ]; then
            echo -e "  ${GREEN}✓${NC} $dir/ 存在"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            echo -e "  ${YELLOW}⚠${NC} $dir/ 缺失"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
else
    echo -e "  ${RED}✗${NC} Vault 目录不存在"
    echo "    → 运行: clausidian init $VAULT"
    FAILED=$((FAILED + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# ============ MCP 配置检查 ============
echo -e "${BLUE}=== 4. MCP 配置 ===${NC}"
MCP_CONFIG="$HOME/.claude/.mcp.json"

if [ -f "$MCP_CONFIG" ]; then
    echo -e "  ${GREEN}✓${NC} MCP 配置文件存在"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))

    # 检查是否包含 clausidian
    if grep -q "clausidian" "$MCP_CONFIG"; then
        echo -e "  ${GREEN}✓${NC} clausidian 已注册"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} clausidian 未在 MCP 配置中"
        echo "    → 运行: clausidian setup $VAULT"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} MCP 配置文件不存在"
    echo "    → Claude Code 可能未初始化，或配置在不同位置"
    WARNINGS=$((WARNINGS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# ============ Claude Code 检查 ============
echo -e "${BLUE}=== 5. Claude Code 整合 ===${NC}"
SKILL_PATH="$HOME/.claude/skills/obsidian/SKILL.md"

if [ -f "$SKILL_PATH" ]; then
    echo -e "  ${GREEN}✓${NC} /obsidian skill 已安装"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "  ${YELLOW}⚠${NC} /obsidian skill 未安装"
    echo "    → 运行: clausidian setup $VAULT"
    WARNINGS=$((WARNINGS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# ============ 权限检查 ============
echo -e "${BLUE}=== 6. 权限检查 ===${NC}"

if [ -d "$VAULT" ]; then
    if [ -w "$VAULT" ]; then
        echo -e "  ${GREEN}✓${NC} Vault 目录可写"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}✗${NC} Vault 目录不可写"
        echo "    → 检查权限: ls -la $VAULT"
        FAILED=$((FAILED + 1))
    fi
fi

if [ -d "$HOME/.claude" ]; then
    if [ -w "$HOME/.claude" ]; then
        echo -e "  ${GREEN}✓${NC} ~/.claude 目录可写"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}✗${NC} ~/.claude 目录不可写"
        FAILED=$((FAILED + 1))
    fi
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# ============ 总结 ============
echo -e "${BLUE}=== 诊断结果 ===${NC}"
echo "通过: $PASSED_CHECKS/$TOTAL_CHECKS"
echo "警告: $WARNINGS"
echo "失败: $FAILED"
echo ""

if [ "$FAILED" -eq 0 ]; then
    if [ "$WARNINGS" -eq 0 ]; then
        echo -e "${GREEN}✓ 环境正常，可以开始使用!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ 环境可用，但有 $WARNINGS 个警告${NC}"
        echo ""
        echo "建议运行以下命令修复："
        echo "  clausidian setup $VAULT"
        exit 0
    fi
else
    echo -e "${RED}✗ 检测到 $FAILED 个错误，需要修复${NC}"
    echo ""
    echo "快速修复步骤："
    echo "  1. 初始化 vault: clausidian init $VAULT"
    echo "  2. 配置整合: clausidian setup $VAULT"
    echo "  3. 重启 Claude Code"
    echo "  4. 重新运行此诊断: bash health.sh"
    exit 1
fi
