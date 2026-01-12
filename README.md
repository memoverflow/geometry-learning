# Geometry Learning - 交互式几何教学工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://www.ecma-international.org/ecma-262/)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

一个基于原生 JavaScript 和 HTML5 Canvas 的交互式几何教学工具，支持多种 2D 几何图形的可视化学习、辅助线绘制和几何测量。

**在线演示**: [https://memoverflow.github.io/geometry-learning/](https://memoverflow.github.io/geometry-learning/)

> 我写这个的目的是因为为了给孩子教学使用，后来我发现一个问题，人和人之间的差距，真的比人和猴子的差距还要大。不要逼孩子，我和自己说，也和各位开发老师说。


## 功能特性

### 图形支持

- **基础元素**: 点、线段、射线、直线
- **三角形**: 任意三角形、等腰三角形、等边三角形、直角三角形
- **四边形**: 任意四边形、平行四边形、矩形、正方形、菱形、梯形、筝形
- **圆形**: 圆、扇形、弧
- **多边形**: 正五边形、正六边形、正七边形、正八边形

### 辅助线系统

支持多种数学辅助线的绘制，带有专业的数学标记：

| 辅助线类型 | 说明 | 标记 |
|-----------|------|------|
| 连接线 | 连接两个顶点 | 端点标记 |
| 中线 | 顶点到对边中点 | 中点圆点 |
| 高线 | 顶点到对边的垂线 | 直角符号 |
| 垂直平分线 | 边的垂直平分线 | 中点 + 垂直符号 |
| 角平分线 | 角的平分线 | 等角弧标记 |
| 平行线 | 过一点作平行线 | 平行箭头 |
| 垂线 | 过一点作垂线 | 直角符号 |
| 中位线 | 连接两边中点 | 双中点标记 |
| 延长线 | 边的延长 | 虚线 |

### 测量工具

- **距离测量**: 点击两点测量距离
- **角度测量**: 点击三点测量角度

### 交互操作

- **拖拽顶点**: 实时改变图形形状
- **旋转图形**: 拖拽中心点旋转
- **缩放图形**: 放大/缩小图形
- **移动图形**: 平移整个图形
- **触摸支持**: 支持移动设备触摸操作

### 其他功能

- **自动保存**: 自动保存到本地存储，刷新页面后恢复
- **截图导出**: 将画布导出为 PNG 图片
- **JSON 保存/加载**: 保存和加载图形数据
- **公式显示**: 显示相关的数学公式
- **实时属性**: 实时计算并显示周长、面积、角度等

## 快速开始

### 环境要求

- 现代浏览器 (Chrome, Firefox, Safari, Edge)
- Python 3.x 或 Node.js (用于本地开发服务器)

### 安装与运行

1. **克隆仓库**

```bash
git clone https://github.com/memoverflow/geometry-learning.git
cd geometry-learning
```

2. **启动开发服务器**

使用 Make (推荐):
```bash
make dev    # 启动服务器并自动打开浏览器
```

或者手动启动:
```bash
# 使用 Python
python3 -m http.server 8080

# 或使用 Node.js
npx serve -l 8080
```

3. **访问应用**

打开浏览器访问 [http://localhost:8080](http://localhost:8080)

### Make 命令

| 命令 | 说明 |
|------|------|
| `make run` | 启动开发服务器 (默认端口 8080) |
| `make dev` | 启动服务器并自动打开浏览器 |
| `make open` | 仅打开浏览器 |
| `make check` | 检查项目文件完整性 |
| `make lint` | 检查 JavaScript 语法 |
| `make clean` | 清理临时文件 |
| `make dist` | 创建发布包 |
| `make help` | 显示帮助信息 |

自定义端口:
```bash
make run PORT=3000
```

## 使用指南

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Esc` | 取消当前操作 |
| `Enter` | 完成多边形绘制 |
| `H` | 显示/隐藏帮助 |
| `+` / `-` | 放大/缩小图形 |
| `←` / `→` | 旋转图形 |

### 基本操作流程

1. **选择图形**: 在左侧边栏选择要学习的几何图形
2. **交互操作**: 拖拽顶点改变形状，观察属性变化
3. **添加辅助线**: 选择辅助线工具，点击顶点或边创建辅助线
4. **测量**: 使用测量工具测量距离或角度
5. **保存/分享**: 截图或保存 JSON 数据

### 辅助线使用

1. 点击工具栏中的辅助线按钮
2. 根据提示点击顶点或边
3. 辅助线会自动绑定到图形，跟随图形变换
4. 使用"撤销"删除最后一条辅助线
5. 使用"清除"删除所有辅助线

## 项目结构

```
geometry-learning/
├── index.html              # 主页面
├── Makefile                # Make 构建脚本
├── README.md               # 项目说明
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── geometry-engine.js  # 核心引擎 (Point, Vector, Matrix, Shape)
│   ├── shapes-2d.js        # 2D 图形 (Triangle, Quadrilateral, Circle, Polygon)
│   ├── renderer.js         # 2D 渲染器
│   ├── auxiliary.js        # 辅助线系统
│   ├── tools.js            # 测量、绘制、动画工具
│   └── app.js              # 主应用 (UI, 交互, 状态管理)
└── data/
    └── presets.json        # 预设图形数据
```

## 技术架构

### 核心模块

- **GeometryEngine**: 几何引擎核心，管理图形、交互和渲染
- **Shape**: 所有图形的基类，提供通用方法
- **Renderer2D**: Canvas 2D 渲染器
- **AuxiliaryLineManager**: 辅助线管理系统

### 设计原则

- **零依赖**: 纯原生 JavaScript，无外部框架依赖
- **模块化**: ES6 模块化设计，代码结构清晰
- **响应式**: 支持桌面和移动设备
- **可扩展**: 易于添加新的图形类型和工具

### 类图

```
Shape (基类)
├── Line2D (线段/射线/直线)
├── Triangle (三角形)
│   ├── IsoscelesTriangle
│   ├── EquilateralTriangle
│   └── RightTriangle
├── Quadrilateral (四边形)
│   ├── Parallelogram
│   ├── Rectangle
│   ├── Square
│   ├── Rhombus
│   ├── Trapezoid
│   └── Kite
├── Circle (圆/扇形/弧)
└── Polygon (多边形)
```

## 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 11+ |
| Edge | 79+ |

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 使用 ES6+ 语法
- 遵循 JSDoc 注释规范
- 保持代码简洁，避免过度工程化

## 路线图

- [ ] 3D 图形支持 (立方体、圆柱、圆锥、球等)
- [ ] 几何变换演示 (平移、旋转、对称、缩放动画)
- [ ] 题目练习模式
- [ ] 多语言支持
- [ ] 协作功能

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- 感谢所有贡献者的付出
- 本项目受 GeoGebra 启发

## 联系方式

- 项目链接: [https://github.com/memoverflow/geometry-learning](https://github.com/memoverflow/geometry-learning)
- 问题反馈: [Issues](https://github.com/memoverflow/geometry-learning/issues)

---

Made with ❤️ for geometry education
