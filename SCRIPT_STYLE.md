# Shell 脚本编码规范

本文档定义了 clausidian 中所有 shell 脚本的编码风格和最佳实践。

---

## 1. 脚本头部

### 标准格式
```bash
#!/bin/bash
# 脚本名称 — 单行简介
# 用法: bash script.sh [arg1] [arg2]

set -e -o pipefail

# 加载共享库（如果需要）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# 可选：临时文件清理陷阱
TEMP_FILE="/tmp/script.$$"
setup_cleanup_trap "$TEMP_FILE"
```

### 必需的 set 选项
- `set -e` — 在任何错误时立即退出
- `set -o pipefail` — 捕获管道中的错误（例：`cmd1 | cmd2` 失败）

---

## 2. 变量和常量

### 常量（全大写）
```bash
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
```

### 环境变量
```bash
VAULT="${1:-$HOME/obsidian-vault}"
NODE_VERSION="${NODE_VERSION:-18}"
```

### 变量命名规范
- **全局变量** — ALL_CAPS（常量）或UPPER_SNAKE_CASE
- **本地变量** — lower_snake_case
- **函数参数** — local name="$1"

### 避免的做法
```bash
# ❌ 不要
cd $HOME        # 无引号，路径中有空格时出错
file=$1         # 没有 local
node_v=$(node -v | sed 's/v//' | cut -d. -f1)  # 复杂，应使用参数扩展
```

### 推荐的做法
```bash
# ✅ 推荐
cd "$HOME"      # 总是引用变量
local file="$1"
node_v="${node_version#v}"  # 使用参数扩展
```

---

## 3. 函数定义

### 格式
```bash
# 功能简介
function_name() {
    local arg1="$1"
    local arg2="$2"

    # 函数体
    [[ -f "$arg1" ]] && return 0
    return 1
}
```

### 规范
- 使用 `local` 声明所有本地变量
- 返回值 0（成功）或 1（失败）
- 在 lib/common.sh 中定义可重用函数
- 在脚本中定义仅本脚本使用的函数

### 错误处理
```bash
# ✅ 推荐：检查失败原因
if ! command_that_might_fail; then
    log_error "具体的错误原因"
    exit 1
fi

# ❌ 不要：模糊的错误信息
command_that_might_fail || exit 1
```

---

## 4. 日志输出

### 使用共享的日志函数（在 lib/common.sh 中定义）

```bash
log_success "消息"    # ✓ 消息（绿色）
log_error "消息"      # ✗ 消息（红色）
log_warn "消息"       # ⚠ 消息（黄色）
log_info "消息"       # ℹ 消息（蓝色）
log_section "标题"    # （蓝色格式化标题）
```

### 不使用的做法
```bash
# ❌ 不要：混合格式
echo -e "${RED}✗ 错误${NC}"
echo -e "${GREEN}✓ 成功${NC}"

# ✅ 推荐
log_error "错误"
log_success "成功"
```

### 打印换行
```bash
# ✅ 推荐
echo ""              # 清晰、一致

# ❌ 避免
echo                 # 容易出错
```

---

## 5. 条件语句

### 推荐格式
```bash
# 文件检查
if [[ -f "$file" ]]; then
    # 处理存在的文件
fi

# 目录检查
if [[ -d "$dir" ]]; then
    # 处理存在的目录
fi

# 命令可用性
if command -v npm &> /dev/null; then
    # 使用 npm
fi

# 版本比较
if [[ "$version" -lt 18 ]]; then
    # 处理低版本
fi
```

### 避免的做法
```bash
# ❌ 不要
[ -f "$file" ]      # 使用 [[ ]] 替代
if test -f "$file"; then   # 不如 [[ ]] 清晰
```

---

## 6. 错误处理和验证

### 检查前置条件
```bash
# 在脚本开始检查所有前置条件
if ! command -v node &> /dev/null; then
    log_error "需要 Node.js"
    exit 1
fi

if ! [[ -d "$VAULT" ]]; then
    log_error "Vault 目录不存在: $VAULT"
    exit 1
fi
```

### 提供有用的错误消息
```bash
# ✅ 推荐：具体的原因和解决方案
if ! npm install -g clausidian 2>&1; then
    log_error "npm install 失败。可能原因："
    echo "  1. 权限问题 → 尝试: sudo npm install -g clausidian"
    echo "  2. 网络问题 → 检查网络连接并重试"
    exit 1
fi

# ❌ 不要：模糊的错误消息
if ! npm install -g clausidian; then
    log_error "安装失败"
    exit 1
fi
```

---

## 7. 临时文件管理

### 使用清理陷阱
```bash
#!/bin/bash
set -e -o pipefail

# 定义临时文件
TEMP_LOG="/tmp/script-$$.log"
TEMP_DIR="/tmp/script-$$"

# 注册清理函数
setup_cleanup_trap "$TEMP_LOG" "$TEMP_DIR"

# 现在可以安心使用临时文件，脚本退出时自动清理
```

### 避免的做法
```bash
# ❌ 不要：永久留下垃圾
> /tmp/debug.log     # 脚本退出后仍保留

# ✅ 推荐：自动清理
> /tmp/debug.$$.log  # 脚本退出时删除
```

---

## 8. 代码复用和共享库

### 共享库（lib/common.sh）中应包含：
- 颜色定义
- 日志函数
- 通用检查函数（Node.js、npm、clausidian 等）
- 通用安装函数（vault 初始化等）
- 清理函数

### 脚本中定义：
- 脚本特定的函数
- 脚本特定的变量

### 导入共享库
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
```

---

## 9. 代码风格

### 缩进
- 使用 4 个空格（一致性重要）

### 括号空格
```bash
# ✅ 推荐
if [[ -f "$file" ]]; then
for i in "${array[@]}"; do
while read line; do

# ❌ 避免
if[[ -f "$file" ]];then
for  i  in "${array[@]}"; do
```

### 引号
- **总是引用变量** — `"$var"` 而不是 `$var`
- **避免多余引号** — `$1` 而不是 `"$1"`（脚本参数已经安全）

```bash
# ✅ 推荐
cd "$HOME"
echo "$file"
local arg1="$1"

# ❌ 避免
cd $HOME              # 路径有空格时出错
echo $file            # 空格处理错误
local arg1='"$1"'     # 多余引号
```

---

## 10. 性能优化

### 避免无必要的子进程
```bash
# ❌ 避免：多个子进程
version=$(node -v | sed 's/v//' | cut -d. -f1)

# ✅ 推荐：参数扩展
version="${node_version#v}"
version="${version%%.*}"
```

### 缓存命令结果
```bash
# ❌ 避免：多次执行相同命令
if command -v node &> /dev/null; then
    node_v=$(node -v)
fi
if command -v node &> /dev/null; then
    node_v=$(node -v)
fi

# ✅ 推荐：只执行一次，重用结果
if command -v node &> /dev/null; then
    node_v=$(node -v)
    echo "Node.js: $node_v"
fi
```

---

## 11. 调试技巧

### 启用调试模式
```bash
# 运行时启用调试
bash -x script.sh      # 打印执行的每个命令

# 或在脚本中
set -x                 # 启用调试输出
set +x                 # 禁用调试输出
```

### 检查脚本语法
```bash
bash -n script.sh      # 检查语法错误，不执行
```

### 使用诊断函数
```bash
# 使用 lib/common.sh 中的检查函数
check_nodejs
check_obsidian_agent
check_vault_initialized "$VAULT"
```

---

## 12. 清单

在提交新脚本前，检查：

- [ ] 脚本头部包含 `#!/bin/bash` 和 `set -e -o pipefail`
- [ ] 使用 `source "$SCRIPT_DIR/lib/common.sh"` 加载共享库
- [ ] 所有文件/目录检查都有引号 `"$var"`
- [ ] 使用 `log_*` 函数而不是 `echo -e`
- [ ] 所有错误消息都包含解决方案建议
- [ ] 本地变量使用 `local` 声明
- [ ] 没有绝对路径，使用 `$SCRIPT_DIR` 或相对路径
- [ ] 临时文件使用 `setup_cleanup_trap`
- [ ] 脚本通过 `bash -n script.sh` 的语法检查
- [ ] 脚本通过 `shellcheck script.sh` 的静态分析（如果安装）

---

## 参考资源

- [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html)
- [shellcheck](https://www.shellcheck.net/) — Shell 脚本 linter
- Bash 手册 — `man bash` 或 https://www.gnu.org/software/bash/manual/

---

**最后更新：** 2026-03-30
**版本：** 1.0
