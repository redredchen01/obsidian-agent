#!/bin/bash
# 完整的自动化测试脚本
# 用法：bash scripts/test-all.sh

set -e -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          clausidian 完整自动化测试套件                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
run_test() {
    local name="$1"
    local cmd="$2"

    echo -n "测试：$name ... "

    if eval "$cmd" > /dev/null 2>&1; then
        log_success "通过"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "失败"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# ============ 1. 语法检查 ============
log_section "1️⃣  语法检查"

run_test "install.sh" "bash -n $SCRIPT_DIR/install.sh"
run_test "setup.sh" "bash -n $SCRIPT_DIR/setup.sh"
run_test "health.sh" "bash -n $SCRIPT_DIR/health.sh"
run_test "verify.sh" "bash -n $SCRIPT_DIR/verify.sh"
run_test "lib/common.sh" "bash -n $SCRIPT_DIR/lib/common.sh"
echo ""

# ============ 2. 共享库函数检查 ============
log_section "2️⃣  共享库函数检查"

# 创建临时测试脚本
TEMP_TEST="/tmp/test-common-$$.sh"
cat > "$TEMP_TEST" << 'EOF'
source "lib/common.sh"

# 测试颜色定义
[[ -n "$RED" ]] || exit 1
[[ -n "$GREEN" ]] || exit 1
[[ -n "$YELLOW" ]] || exit 1
[[ -n "$BLUE" ]] || exit 1
[[ -n "$NC" ]] || exit 1

# 测试日志函数
type log_success &> /dev/null || exit 1
type log_error &> /dev/null || exit 1
type log_warn &> /dev/null || exit 1
type log_info &> /dev/null || exit 1
type log_section &> /dev/null || exit 1

# 测试检查函数
type check_nodejs &> /dev/null || exit 1
type check_npm &> /dev/null || exit 1
type check_obsidian_agent &> /dev/null || exit 1
type check_vault_initialized &> /dev/null || exit 1

# 测试安装函数
type install_obsidian_agent &> /dev/null || exit 1
type init_vault &> /dev/null || exit 1
type setup_claude_integration &> /dev/null || exit 1

exit 0
EOF

(
    cd "$SCRIPT_DIR"
    run_test "颜色和日志函数" "bash $TEMP_TEST"
)

rm -f "$TEMP_TEST"
echo ""

# ============ 3. ShellCheck 检查 ============
log_section "3️⃣  ShellCheck 静态分析"

if command -v shellcheck &> /dev/null; then
    run_test "install.sh" "shellcheck $SCRIPT_DIR/install.sh"
    run_test "setup.sh" "shellcheck $SCRIPT_DIR/setup.sh"
    run_test "health.sh" "shellcheck $SCRIPT_DIR/health.sh"
    run_test "verify.sh" "shellcheck $SCRIPT_DIR/verify.sh"
    run_test "lib/common.sh" "shellcheck $SCRIPT_DIR/lib/common.sh"
else
    log_warn "ShellCheck 未安装，跳过此步"
    echo "   安装：brew install shellcheck（macOS）"
    echo "        apt install shellcheck（Linux）"
fi
echo ""

# ============ 4. 文件完整性 ============
log_section "4️⃣  文件完整性检查"

REQUIRED_FILES=(
    "install.sh"
    "setup.sh"
    "health.sh"
    "verify.sh"
    "lib/common.sh"
    "README.md"
    "QUICKSTART.md"
    "CHANGELOG.md"
    "SCRIPT_STYLE.md"
    "UPGRADE_SUMMARY.md"
    "VERSION"
    "mcp-config-example.json"
    "skill/SKILL.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$SCRIPT_DIR/$file" ]]; then
        log_success "$file 存在"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "$file 缺失"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
done
echo ""

# ============ 总结报告 ============
log_section "📊 测试总结"

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
if [[ $TOTAL -gt 0 ]]; then
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL))
else
    SUCCESS_RATE=0
fi

echo "通过：$TESTS_PASSED/$TOTAL （$SUCCESS_RATE%）"
echo "失败：$TESTS_FAILED"
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    log_success "所有测试通过！项目质量良好 ✨"
    exit 0
else
    log_error "部分测试失败，需要修复"
    exit 1
fi
