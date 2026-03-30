#!/bin/bash
# clausidian 共享库
# 颜色定义、日志函数和通用检查

# ============ 颜色定义 ============
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# ============ 日志函数 ============
log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo ""
}

# ============ 检查函数 ============

# 检查 Node.js 是否已安装且版本足够
check_nodejs() {
    if ! command -v node &> /dev/null; then
        return 1
    fi

    local node_ver
    node_ver=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$node_ver" -lt 18 ]; then
        return 1
    fi
    return 0
}

# 获取 Node.js 版本字符串
get_nodejs_version() {
    node -v 2>/dev/null || echo "unknown"
}

# 检查 npm 是否已安装
check_npm() {
    command -v npm &> /dev/null
}

# 检查 clausidian 是否已安装
check_obsidian_agent() {
    command -v clausidian &> /dev/null
}

# 获取 clausidian 版本字符串
get_obsidian_agent_version() {
    clausidian --version 2>/dev/null || echo "unknown"
}

# 检查 Vault 目录是否初始化
check_vault_initialized() {
    local vault_path="$1"

    if [ ! -d "$vault_path" ]; then
        return 1
    fi

    if [ ! -f "$vault_path/AGENT.md" ]; then
        return 1
    fi

    return 0
}

# 安装 clausidian CLI
install_obsidian_agent() {
    if ! npm install -g clausidian 2>&1; then
        return 1
    fi
    return 0
}

# 初始化 Vault
init_vault() {
    local vault_path="$1"

    if ! clausidian init "$vault_path" > /dev/null 2>&1; then
        return 1
    fi
    return 0
}

# 设置 Claude Code 整合
setup_claude_integration() {
    local vault_path="$1"

    if ! clausidian setup "$vault_path" > /dev/null 2>&1; then
        return 1
    fi
    return 0
}

# ============ 通用诊断函数 ============

# 检查项（用于 health.sh 和 verify.sh）
# 用法: check_item "检查名称" "命令" ["warning"]
check_item() {
    local name="$1"
    local cmd="$2"
    local is_warning="${3:-0}"

    echo -n "检查: $name ... "

    if eval "$cmd" > /dev/null 2>&1; then
        log_success "通过"
        return 0
    else
        if [ "$is_warning" = "warning" ]; then
            log_warn "警告"
            return 2
        else
            log_error "失败"
            return 1
        fi
    fi
}

# ============ 清理函数 ============

# 设置清理陷阱（清除临时文件）
setup_cleanup_trap() {
    local temp_files=("$@")

    trap "rm -f ${temp_files[*]}" EXIT INT TERM
}

# ============ 导出函数（可选，用于 subshell） ============
export -f log_success log_error log_warn log_info log_section
export -f check_nodejs get_nodejs_version check_npm
export -f check_obsidian_agent get_obsidian_agent_version
export -f check_vault_initialized
export -f install_obsidian_agent init_vault setup_claude_integration
export -f check_item setup_cleanup_trap
