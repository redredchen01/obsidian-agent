#!/bin/bash
# clausidian 一键完整配置脚本
# 用法: bash setup.sh [vault-path]

set -e -o pipefail

# 配置
VAULT="${1:-$HOME/obsidian-vault}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 加载共享库
source "$SCRIPT_DIR/lib/common.sh"

# 临时文件清理
TEMP_HEALTH_LOG="/tmp/health.$$"
setup_cleanup_trap "$TEMP_HEALTH_LOG"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      clausidian 完整一键配置                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ============ 环境预检 ============
log_section "第 1 步：环境预检"

if ! check_nodejs; then
    log_error "需要 Node.js >= 18"
    echo "  访问：https://nodejs.org/"
    exit 1
fi

log_success "Node.js $(get_nodejs_version)"
echo ""

# ============ 安装 ============
log_section "第 2 步：安装 clausidian CLI"

if ! check_obsidian_agent; then
    if ! install_obsidian_agent; then
        log_error "npm install 失败"
        echo "  尝试：sudo npm install -g clausidian"
        exit 1
    fi
fi

log_success "clausidian 已安装"
echo ""

# ============ Vault 初始化 ============
log_section "第 3 步：初始化 vault"
echo "  路径：$VAULT"

if check_vault_initialized "$VAULT"; then
    log_success "Vault 已存在，跳过初始化"
else
    if ! init_vault "$VAULT"; then
        log_error "Vault 初始化失败"
        exit 1
    fi
    log_success "Vault 初始化成功"
fi
echo ""

# ============ 诊断和验证 ============
log_section "第 4 步：诊断和验证"

if [ -f "$SCRIPT_DIR/health.sh" ]; then
    echo "  运行诊断脚本..."
    if bash "$SCRIPT_DIR/health.sh" > "$TEMP_HEALTH_LOG" 2>&1; then
        log_success "诊断通过"
    else
        log_warn "诊断有警告"
    fi
else
    log_warn "诊断脚本不存在（可忽略）"
fi
echo ""

# ============ Claude Code 配置 ============
log_section "第 5 步：配置 Claude Code 整合"

if ! setup_claude_integration "$VAULT"; then
    log_error "Claude Code 配置失败"
    exit 1
fi

log_success "Claude Code 整合成功"
echo ""

# ============ 显示配置信息 ============
log_section "配置完成！"
echo "📁 Vault 路径：$VAULT"
echo "📝 设置环境变量："
echo "   export OA_VAULT=\"$VAULT\""
echo ""

# 建议添加到 shell 配置文件
if grep -q "OA_VAULT" ~/.zshrc 2>/dev/null || grep -q "OA_VAULT" ~/.bashrc 2>/dev/null; then
    log_success "环境变量已配置"
else
    echo "💡 建议：将以下行加到 ~/.zshrc 或 ~/.bashrc"
    echo "   export OA_VAULT=\"$VAULT\""
fi
echo ""

# ============ 验证可选 ============
if [ -f "$SCRIPT_DIR/verify.sh" ]; then
    log_section "第 6 步：可选 — 运行完整功能测试"
    read -p "是否运行完整验证测试？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if bash "$SCRIPT_DIR/verify.sh" > /dev/null 2>&1; then
            log_success "所有测试通过"
        else
            log_warn "部分测试失败，但可以继续使用"
        fi
        echo ""
    fi
fi

# ============ 最后提示 ============
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   🎉 设置完成！                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "下一步："
echo "  1. 重启 Claude Code"
echo "  2. 在任何项目目录运行："
echo "     /obsidian 写日记"
echo ""
echo "帮助："
echo "  • 快速入门：阅读 QUICKSTART.md"
echo "  • 诊断环境：bash health.sh"
echo "  • 验证功能：bash verify.sh"
echo "  • 完整文档：阅读 README.md"
echo "  • 故障排查：查看 skill/SKILL.md"
echo ""
log_success "祝你使用愉快！🚀"
