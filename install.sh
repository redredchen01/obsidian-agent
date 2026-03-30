#!/bin/bash
# clausidian 一键安装脚本
# 用法: bash install.sh [vault-path]
#   vault-path 默认为 ~/obsidian-vault

set -e -o pipefail

# 加载共享库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

VAULT="${1:-$HOME/obsidian-vault}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           clausidian 一键安装脚本                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! check_nodejs; then
    log_error "需要 Node.js >= 18。请先安装："
    echo "  https://nodejs.org/"
    exit 1
fi
log_success "Node.js $(get_nodejs_version) OK"
echo ""

# Install CLI
echo "1/3 安装 clausidian CLI..."
if ! install_obsidian_agent; then
    log_error "npm install 失败。可能原因："
    echo "  1. 权限问题 → 尝试: sudo npm install -g clausidian"
    echo "  2. 网络问题 → 检查网络连接并重试"
    echo "  3. 磁盘满了 → 清理磁盘空间"
    exit 1
fi

# Verify installation
if ! check_obsidian_agent; then
    log_error "clausidian 安装后仍无法找到。可能需要："
    echo "  1. npm config get prefix 检查全局安装位置"
    echo "  2. 将该路径加到 PATH: export PATH=\$(npm config get prefix)/bin:\$PATH"
    exit 1
fi
log_success "clausidian 已安装"
echo ""

# Init vault
echo "2/3 初始化 vault: $VAULT"
if check_vault_initialized "$VAULT"; then
    log_info "Vault 已存在，跳过 init"
else
    if ! init_vault "$VAULT"; then
        log_error "vault 初始化失败。检查："
        echo "  1. 是否有写入 $VAULT 的权限"
        echo "  2. 磁盘空间是否足够"
        exit 1
    fi
    log_success "Vault 初始化成功"
fi
echo ""

# Setup Claude Code
echo "3/3 配置 Claude Code 整合..."
if ! setup_claude_integration "$VAULT"; then
    log_error "Claude Code 配置失败。检查："
    echo "  1. clausidian setup 的输出信息"
    echo "  2. ~/.claude 目录是否存在和可写"
    exit 1
fi
log_success "Claude Code 整合成功"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ✨ 安装完成！                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔄 重启 Claude Code 后，即可在任何项目目录使用："
echo ""
echo "  /obsidian 写日记"
echo "  /obsidian 记一下 我的想法"
echo "  /obsidian 搜 关键词"
echo "  /obsidian 读 笔记名"
echo ""
echo "📁 Vault 路径: $VAULT"
echo ""
echo "📚 更多命令: /obsidian help 或查看 $VAULT/AGENT.md"
