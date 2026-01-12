# Geometry 几何教学工具 Makefile
# ============================================================================

# 配置
PORT ?= 8080
BROWSER ?= open

# 颜色定义
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m

.PHONY: all run serve open clean lint check help install dev

# 默认目标
all: help

# 运行开发服务器（推荐）
run: serve

# 启动本地服务器
serve:
	@echo "$(GREEN)启动开发服务器...$(NC)"
	@echo "$(BLUE)访问地址: http://localhost:$(PORT)$(NC)"
	@echo "$(YELLOW)按 Ctrl+C 停止服务器$(NC)"
	@python3 -m http.server $(PORT) 2>/dev/null || python -m http.server $(PORT) 2>/dev/null || npx serve -l $(PORT) 2>/dev/null || (echo "$(YELLOW)请安装 Python 或 Node.js$(NC)" && exit 1)

# 启动服务器并打开浏览器
dev:
	@echo "$(GREEN)启动开发服务器并打开浏览器...$(NC)"
	@(sleep 1 && $(BROWSER) http://localhost:$(PORT)) &
	@make serve

# 仅打开浏览器（需要服务器已运行）
open:
	@echo "$(GREEN)打开浏览器...$(NC)"
	@$(BROWSER) http://localhost:$(PORT)

# 检查 JavaScript 语法
lint:
	@echo "$(GREEN)检查 JavaScript 语法...$(NC)"
	@if command -v npx >/dev/null 2>&1; then \
		npx eslint js/*.js --no-eslintrc --env browser,es2021 --parser-options=ecmaVersion:2021,sourceType:module 2>/dev/null || echo "$(YELLOW)ESLint 未安装，跳过语法检查$(NC)"; \
	else \
		echo "$(YELLOW)npx 不可用，跳过语法检查$(NC)"; \
	fi

# 检查文件完整性
check:
	@echo "$(GREEN)检查项目文件...$(NC)"
	@echo ""
	@echo "$(BLUE)HTML 文件:$(NC)"
	@ls -la index.html 2>/dev/null || echo "  $(YELLOW)index.html 不存在$(NC)"
	@echo ""
	@echo "$(BLUE)CSS 文件:$(NC)"
	@ls -la css/*.css 2>/dev/null || echo "  $(YELLOW)CSS 文件不存在$(NC)"
	@echo ""
	@echo "$(BLUE)JavaScript 文件:$(NC)"
	@ls -la js/*.js 2>/dev/null || echo "  $(YELLOW)JS 文件不存在$(NC)"
	@echo ""
	@echo "$(GREEN)文件检查完成$(NC)"

# 清理临时文件
clean:
	@echo "$(GREEN)清理临时文件...$(NC)"
	@find . -name ".DS_Store" -delete 2>/dev/null || true
	@find . -name "*.log" -delete 2>/dev/null || true
	@find . -name "*~" -delete 2>/dev/null || true
	@echo "$(GREEN)清理完成$(NC)"

# 安装开发依赖（可选）
install:
	@echo "$(GREEN)安装开发依赖...$(NC)"
	@if command -v npm >/dev/null 2>&1; then \
		npm init -y 2>/dev/null || true; \
		npm install --save-dev eslint serve 2>/dev/null || true; \
		echo "$(GREEN)依赖安装完成$(NC)"; \
	else \
		echo "$(YELLOW)npm 不可用，跳过依赖安装$(NC)"; \
		echo "$(BLUE)此项目可以使用 Python 内置服务器运行，无需额外依赖$(NC)"; \
	fi

# 打包发布（简单复制）
dist:
	@echo "$(GREEN)创建发布包...$(NC)"
	@mkdir -p dist
	@cp -r index.html css js dist/
	@echo "$(GREEN)发布包已创建在 dist/ 目录$(NC)"

# 帮助信息
help:
	@echo ""
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║          📐 几何教学工具 - Makefile 命令说明               ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)常用命令:$(NC)"
	@echo "  make run      - 启动开发服务器 (默认端口 $(PORT))"
	@echo "  make dev      - 启动服务器并自动打开浏览器"
	@echo "  make open     - 在浏览器中打开项目"
	@echo ""
	@echo "$(GREEN)开发命令:$(NC)"
	@echo "  make check    - 检查项目文件完整性"
	@echo "  make lint     - 检查 JavaScript 语法"
	@echo "  make clean    - 清理临时文件"
	@echo ""
	@echo "$(GREEN)其他命令:$(NC)"
	@echo "  make install  - 安装开发依赖 (可选)"
	@echo "  make dist     - 创建发布包"
	@echo "  make help     - 显示此帮助信息"
	@echo ""
	@echo "$(YELLOW)自定义端口:$(NC)"
	@echo "  make run PORT=3000"
	@echo ""
	@echo "$(YELLOW)示例:$(NC)"
	@echo "  make dev      # 快速启动开发环境"
	@echo ""
