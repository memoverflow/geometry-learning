/**
 * 主应用模块
 * 处理 UI 交互、导航、工具栏和整体应用逻辑
 */

import { GeometryEngine, Point } from './geometry-engine.js';
import { createShape2D, shapeFromJSON } from './shapes-2d.js';
import { createTools } from './tools.js';
import { AuxiliaryLineManager } from './auxiliary.js';

// ============================================================================
// 应用配置
// ============================================================================
const CONFIG = {
    categories: [
        {
            id: 'basic',
            name: '基础元素',
            icon: '📍',
            items: [
                { id: 'point', name: '点' },
                { id: 'segment', name: '线段' },
                { id: 'ray', name: '射线' },
                { id: 'straightLine', name: '直线' }
            ]
        },
        {
            id: 'triangles',
            name: '三角形',
            icon: '🔺',
            items: [
                { id: 'triangle-any', name: '任意三角形' },
                { id: 'triangle-isosceles', name: '等腰三角形' },
                { id: 'triangle-equilateral', name: '等边三角形' },
                { id: 'triangle-right', name: '直角三角形' }
            ]
        },
        {
            id: 'quadrilaterals',
            name: '四边形',
            icon: '⬜',
            items: [
                { id: 'quadrilateral-any', name: '任意四边形' },
                { id: 'parallelogram', name: '平行四边形' },
                { id: 'rectangle', name: '矩形' },
                { id: 'square', name: '正方形' },
                { id: 'rhombus', name: '菱形' },
                { id: 'trapezoid', name: '梯形' },
                { id: 'kite', name: '筝形' }
            ]
        },
        {
            id: 'circles',
            name: '圆',
            icon: '⭕',
            items: [
                { id: 'circle', name: '圆' },
                { id: 'sector', name: '扇形' },
                { id: 'arc', name: '弧' }
            ]
        },
        {
            id: 'polygons',
            name: '多边形',
            icon: '⬡',
            items: [
                { id: 'pentagon', name: '正五边形' },
                { id: 'hexagon', name: '正六边形' },
                { id: 'polygon-7', name: '正七边形' },
                { id: 'polygon-8', name: '正八边形' }
            ]
        }
    ]
};

// ============================================================================
// 本地存储配置
// ============================================================================
const STORAGE_KEY = 'geometry_app_state';
const AUTO_SAVE_DELAY = 1000; // 自动保存延迟（毫秒）

// ============================================================================
// GeometryApp 主应用类
// ============================================================================
export class GeometryApp {
    constructor() {
        this.engine = null;
        this.tools = null;
        this.currentShape = null;

        // UI 状态
        this.activeTool = null;
        this.expandedCategories = new Set(['basic', 'triangles', 'quadrilaterals']);

        // 移动工具状态
        this.isMovingShape = false;
        this.lastMousePos = null;

        // 辅助线管理器
        this.auxiliaryManager = null;

        // 自动保存定时器
        this._autoSaveTimer = null;

        // 当前选中的形状ID（用于恢复）
        this.lastShapeId = null;

        this.init();
    }

    init() {
        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // 获取 Canvas
        const canvas = document.getElementById('geometryCanvas');
        if (!canvas) {
            console.error('Canvas not found');
            return;
        }

        // 处理高 DPI 屏幕
        this.setupHighDPI(canvas);

        // 初始化引擎
        this.engine = new GeometryEngine(canvas);

        // 初始化工具
        this.tools = createTools(this.engine);

        // 初始化辅助线管理器
        this.auxiliaryManager = new AuxiliaryLineManager(this.engine);

        // 构建 UI
        this.buildSidebar();
        this.buildToolbar();
        this.bindEvents();

        // 尝试从本地存储恢复状态
        if (!this._loadFromLocalStorage()) {
            // 如果没有保存的状态，默认加载一个形状
            this.loadShape('triangle-equilateral');
        }

        // 更新信息面板
        this.updateInfoPanel();

        console.log('GeometryApp initialized');
    }

    // 处理高 DPI 屏幕，使 Canvas 清晰
    setupHighDPI(canvas) {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // 设置 Canvas 的实际像素尺寸
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // 设置 Canvas 的 CSS 显示尺寸
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        // 缩放绘图上下文以匹配设备像素比
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 保存 dpr 以供后续使用
        this.dpr = dpr;
    }

    // ========================================================================
    // UI 构建
    // ========================================================================
    buildSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        let html = '<div class="sidebar-header"><h2>📐 几何图形</h2></div>';
        html += '<div class="category-list">';

        for (const category of CONFIG.categories) {
            const isExpanded = this.expandedCategories.has(category.id);

            html += `
                <div class="category" data-category="${category.id}">
                    <div class="category-header ${isExpanded ? 'expanded' : ''}" data-category="${category.id}">
                        <span class="category-icon">${category.icon}</span>
                        <span class="category-name">${category.name}</span>
                        <span class="category-arrow">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                    <div class="category-items ${isExpanded ? 'expanded' : ''}">
            `;

            for (const item of category.items) {
                html += `
                    <div class="shape-item" data-shape="${item.id}">
                        <span class="shape-name">${item.name}</span>
                    </div>
                `;
            }

            html += '</div></div>';
        }

        html += '</div>';
        sidebar.innerHTML = html;

        // 绑定分类展开/收起
        sidebar.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const categoryId = header.dataset.category;
                this.toggleCategory(categoryId);
            });
        });

        // 绑定形状选择
        sidebar.querySelectorAll('.shape-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const shapeId = item.dataset.shape;
                this.loadShape(shapeId);

                // 更新选中状态
                sidebar.querySelectorAll('.shape-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    toggleCategory(categoryId) {
        const sidebar = document.getElementById('sidebar');
        const header = sidebar.querySelector(`.category-header[data-category="${categoryId}"]`);
        const items = header.nextElementSibling;
        const arrow = header.querySelector('.category-arrow');

        if (this.expandedCategories.has(categoryId)) {
            this.expandedCategories.delete(categoryId);
            header.classList.remove('expanded');
            items.classList.remove('expanded');
            arrow.textContent = '▶';
        } else {
            this.expandedCategories.add(categoryId);
            header.classList.add('expanded');
            items.classList.add('expanded');
            arrow.textContent = '▼';
        }
    }

    buildToolbar() {
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) return;

        toolbar.innerHTML = `
            <div class="toolbar-group">
                <button class="tool-btn" data-tool="reset" title="重置">
                    <span class="tool-icon">🔄</span>
                    <span class="tool-label">重置</span>
                </button>
            </div>
            <div class="toolbar-group">
                <button class="tool-btn" data-tool="zoom-in" title="放大">
                    <span class="tool-icon">🔍+</span>
                    <span class="tool-label">放大</span>
                </button>
                <button class="tool-btn" data-tool="zoom-out" title="缩小">
                    <span class="tool-icon">🔍-</span>
                    <span class="tool-label">缩小</span>
                </button>
                <button class="tool-btn" data-tool="move" title="移动图形">
                    <span class="tool-icon">✋</span>
                    <span class="tool-label">移动</span>
                </button>
                <button class="tool-btn" data-tool="rotate-left" title="向左旋转">
                    <span class="tool-icon">↺</span>
                    <span class="tool-label">左转</span>
                </button>
                <button class="tool-btn" data-tool="rotate-right" title="向右旋转">
                    <span class="tool-icon">↻</span>
                    <span class="tool-label">右转</span>
                </button>
            </div>
            <div class="toolbar-group">
                <button class="tool-btn" data-tool="measure-distance" title="测量距离">
                    <span class="tool-icon">📏</span>
                    <span class="tool-label">距离</span>
                </button>
                <button class="tool-btn" data-tool="measure-angle" title="测量角度">
                    <span class="tool-icon">📐</span>
                    <span class="tool-label">角度</span>
                </button>
            </div>
            <div class="toolbar-group">
                <button class="tool-btn" data-tool="draw-point" title="绘制点">
                    <span class="tool-icon">•</span>
                    <span class="tool-label">点</span>
                </button>
                <button class="tool-btn" data-tool="draw-line" title="绘制线">
                    <span class="tool-icon">╱</span>
                    <span class="tool-label">线</span>
                </button>
                <button class="tool-btn" data-tool="draw-polygon" title="绘制多边形">
                    <span class="tool-icon">⬠</span>
                    <span class="tool-label">多边形</span>
                </button>
            </div>
            <div class="toolbar-group auxiliary-group">
                <button class="tool-btn" data-tool="aux-connecting" title="连接线（连接两个顶点）">
                    <span class="tool-icon">╲</span>
                    <span class="tool-label">连接</span>
                </button>
                <button class="tool-btn" data-tool="aux-median" title="中线（顶点到对边中点）">
                    <span class="tool-icon">M</span>
                    <span class="tool-label">中线</span>
                </button>
                <button class="tool-btn" data-tool="aux-altitude" title="高线（顶点到对边的垂线）">
                    <span class="tool-icon">H</span>
                    <span class="tool-label">高线</span>
                </button>
                <button class="tool-btn" data-tool="aux-perp-bisector" title="垂直平分线">
                    <span class="tool-icon">⊥</span>
                    <span class="tool-label">垂分</span>
                </button>
                <button class="tool-btn" data-tool="aux-angle-bisector" title="角平分线">
                    <span class="tool-icon">∠</span>
                    <span class="tool-label">角分</span>
                </button>
                <button class="tool-btn" data-tool="aux-parallel" title="平行线（过一点作平行线）">
                    <span class="tool-icon">∥</span>
                    <span class="tool-label">平行</span>
                </button>
                <button class="tool-btn" data-tool="aux-perpendicular" title="垂线（过一点作垂线）">
                    <span class="tool-icon">⟂</span>
                    <span class="tool-label">垂线</span>
                </button>
                <button class="tool-btn" data-tool="aux-midline" title="中位线（连接两边中点）">
                    <span class="tool-icon">—</span>
                    <span class="tool-label">中位</span>
                </button>
                <button class="tool-btn" data-tool="aux-extension" title="延长线">
                    <span class="tool-icon">→</span>
                    <span class="tool-label">延长</span>
                </button>
                <button class="tool-btn" data-tool="aux-undo" title="撤销最后一条辅助线">
                    <span class="tool-icon">↩</span>
                    <span class="tool-label">撤销</span>
                </button>
                <button class="tool-btn" data-tool="aux-clear" title="清除所有辅助线">
                    <span class="tool-icon">✕</span>
                    <span class="tool-label">清除</span>
                </button>
            </div>
            <div class="toolbar-group">
                <button class="tool-btn" data-tool="animate" title="动画演示">
                    <span class="tool-icon">▶</span>
                    <span class="tool-label">动画</span>
                </button>
            </div>
            <div class="toolbar-group">
                <button class="tool-btn" data-tool="screenshot" title="截图">
                    <span class="tool-icon">📷</span>
                    <span class="tool-label">截图</span>
                </button>
                <button class="tool-btn" data-tool="save" title="保存">
                    <span class="tool-icon">💾</span>
                    <span class="tool-label">保存</span>
                </button>
                <button class="tool-btn" data-tool="load" title="加载">
                    <span class="tool-icon">📂</span>
                    <span class="tool-label">加载</span>
                </button>
                <button class="tool-btn danger" data-tool="clear-all" title="清除所有数据（包括本地存储）">
                    <span class="tool-icon">🗑️</span>
                    <span class="tool-label">清除</span>
                </button>
            </div>
            <div class="toolbar-group">
                <button class="tool-btn" data-tool="help" title="帮助 (H)">
                    <span class="tool-icon">❓</span>
                    <span class="tool-label">帮助</span>
                </button>
            </div>
        `;

        // 绑定工具按钮事件
        toolbar.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = btn.dataset.tool;
                this.handleToolAction(tool, btn);
            });
        });
    }

    // ========================================================================
    // 事件绑定
    // ========================================================================
    bindEvents() {
        // 显示选项
        const checkboxes = document.querySelectorAll('.display-option input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const option = checkbox.dataset.option;
                this.engine.showOptions[option] = checkbox.checked;
                this.render();
            });
        });

        // 引擎事件
        this.engine.on('select', (shape) => {
            this.currentShape = shape;
            this.updateInfoPanel();
        });

        this.engine.on('change', (shape) => {
            this.updateInfoPanel();
            this.render(); // 统一由 app.js 渲染，确保辅助线等元素正确显示
            this._scheduleAutoSave(); // 形状变化时触发自动保存
        });

        this.engine.on('measure', (data) => {
            this.showMeasureResult(data);
        });

        // Canvas 事件（用于测量和绘制工具）
        const canvas = this.engine.canvas;

        canvas.addEventListener('click', (e) => {
            if (this.activeTool) {
                const pos = this.getCanvasPos(e);
                this.handleCanvasClick(pos);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const pos = this.getCanvasPos(e);

            if (this.activeTool === 'draw-polygon' || this.activeTool === 'draw-line') {
                this.tools.draw.setTempPoint(pos);
                this.render();
            }

            // 辅助线工具悬停
            if (this.activeTool && this.activeTool.startsWith('aux-')) {
                this.auxiliaryManager.setHoveredElement(pos);
                this.render();
            }

            // 移动图形
            if (this.isMovingShape && this.currentShape && this.lastMousePos) {
                const dx = pos.x - this.lastMousePos.x;
                const dy = pos.y - this.lastMousePos.y;

                if (this.currentShape.translate) {
                    this.currentShape.translate(dx, dy);
                }

                this.lastMousePos = pos;
                this.render();
                this.updateInfoPanel();
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            const pos = this.getCanvasPos(e);

            // 移动工具
            if (this.activeTool === 'move' && this.currentShape) {
                this.isMovingShape = true;
                this.lastMousePos = pos;
                canvas.style.cursor = 'grabbing';
                return;
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.isMovingShape = false;
            this.lastMousePos = null;

            if (this.activeTool === 'move') {
                this.engine.canvas.style.cursor = 'grab';
            }
        });

        canvas.addEventListener('dblclick', (e) => {
            // 双击完成多边形绘制
            if (this.activeTool === 'draw-polygon') {
                const shape = this.tools.draw.complete();
                if (shape) {
                    this.addDrawnShape(shape);
                }
                this.deactivateTool();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // 如果在输入框中，不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'Escape') {
                this.deactivateTool();
                this.hideHelp();
            } else if (e.key === 'Enter' && this.activeTool === 'draw-polygon') {
                const shape = this.tools.draw.complete();
                if (shape) {
                    this.addDrawnShape(shape);
                }
                this.deactivateTool();
            } else if (e.key.toLowerCase() === 'h') {
                // H 键显示/隐藏帮助
                const helpPanel = document.querySelector('.help-panel');
                if (helpPanel) {
                    this.hideHelp();
                } else {
                    this.showHelp();
                }
            } else if (e.key === '+' || e.key === '=') {
                // + 键放大
                this.zoomShape(1.1);
            } else if (e.key === '-') {
                // - 键缩小
                this.zoomShape(0.9);
            } else if (e.key === 'ArrowLeft') {
                // 左箭头逆时针旋转
                this.rotateShape(-Math.PI / 36);
            } else if (e.key === 'ArrowRight') {
                // 右箭头顺时针旋转
                this.rotateShape(Math.PI / 36);
            }
        });

        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    getCanvasPos(e) {
        const canvas = this.engine.canvas;
        const rect = canvas.getBoundingClientRect();
        // 由于 ctx.scale(dpr, dpr) 已经处理了缩放，这里直接使用 CSS 坐标
        return new Point(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
    }

    findShapeAt(pos) {
        for (const shape of this.engine.shapes.values()) {
            if (shape.contains && shape.contains(pos)) {
                return shape;
            }
        }
        return null;
    }

    // ========================================================================
    // 形状加载
    // ========================================================================
    loadShape(shapeId) {
        // 清空当前形状和辅助线
        this.engine.clearShapes();
        this.auxiliaryManager.clearAll();

        // 保存当前形状ID（用于恢复）
        this.lastShapeId = shapeId;

        // 创建形状
        const shape = createShape2D(shapeId);
        this.engine.canvas.style.cursor = 'crosshair';

        if (shape) {
            // 将形状移动到画布中心
            this.centerShape(shape);

            this.engine.addShape(shape);
            this.currentShape = shape;
            this.engine.selectShape(shape);
        }

        this.updateInfoPanel();
        this.updateAuxiliaryButtons(); // 更新辅助线按钮状态
        this.render();

        // 触发自动保存
        this._scheduleAutoSave();
    }

    // 更新辅助线按钮的启用/禁用状态
    updateAuxiliaryButtons() {
        // 辅助线按钮与对应的类型映射
        const auxButtonMap = {
            'aux-connecting': 'connecting',
            'aux-median': 'median',
            'aux-altitude': 'altitude',
            'aux-perp-bisector': 'perpendicular-bisector',
            'aux-angle-bisector': 'angle-bisector',
            'aux-parallel': 'parallel',
            'aux-perpendicular': 'perpendicular',
            'aux-midline': 'midline',
            'aux-extension': 'extension'
        };

        // 获取当前形状支持的辅助线类型
        const availableTypes = this.auxiliaryManager.getAvailableTypesForCurrentShape();

        // 更新每个辅助线按钮的状态
        for (const [btnTool, auxType] of Object.entries(auxButtonMap)) {
            const btn = document.querySelector(`[data-tool="${btnTool}"]`);
            if (btn) {
                const isAvailable = availableTypes.includes(auxType);
                btn.disabled = !isAvailable;
                btn.classList.toggle('disabled', !isAvailable);

                // 更新 title 提示
                if (!isAvailable) {
                    btn.title = `${btn.querySelector('.tool-label')?.textContent || btnTool} - 当前图形不支持`;
                } else {
                    // 恢复原始 title
                    const originalTitles = {
                        'aux-connecting': '连接线（连接两个顶点）',
                        'aux-median': '中线（顶点到对边中点）',
                        'aux-altitude': '高线（顶点到对边的垂线）',
                        'aux-perp-bisector': '垂直平分线',
                        'aux-angle-bisector': '角平分线',
                        'aux-parallel': '平行线（过一点作平行线）',
                        'aux-perpendicular': '垂线（过一点作垂线）',
                        'aux-midline': '中位线（连接两边中点）',
                        'aux-extension': '延长线'
                    };
                    btn.title = originalTitles[btnTool] || '';
                }
            }
        }
    }

    centerShape(shape) {
        const canvas = this.engine.canvas;
        // 使用 CSS 尺寸（而不是实际像素尺寸）来计算中心
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const shapeCenter = shape.getCenter();

        if (shape.points) {
            // 2D 形状
            const dx = centerX - shapeCenter.x;
            const dy = centerY - shapeCenter.y;

            for (const p of shape.points) {
                p.x += dx;
                p.y += dy;
            }
        }
    }

    // ========================================================================
    // 工具操作
    // ========================================================================
    handleToolAction(tool, btn) {
        // 可切换工具列表（点击已激活的工具会取消选中）
        const toggleableTools = [
            'measure-distance', 'measure-angle',
            'draw-point', 'draw-line', 'draw-polygon',
            'move',
            'aux-connecting', 'aux-median', 'aux-altitude',
            'aux-perp-bisector', 'aux-angle-bisector',
            'aux-parallel', 'aux-perpendicular', 'aux-midline', 'aux-extension'
        ];

        // 如果点击的是当前已激活的工具，则取消选中
        if (toggleableTools.includes(tool) && this.activeTool === tool) {
            this.deactivateTool();
            return;
        }

        switch (tool) {
            case 'reset':
                this.resetShape();
                break;

            case 'random':
                this.randomizeShape();
                break;

            case 'measure-distance':
                this.activateTool('measure-distance', btn);
                this.tools.measure.activate('distance');
                break;

            case 'measure-angle':
                this.activateTool('measure-angle', btn);
                this.tools.measure.activate('angle');
                break;

            case 'draw-point':
                this.activateTool('draw-point', btn);
                this.tools.draw.activate('point');
                break;

            case 'draw-line':
                this.activateTool('draw-line', btn);
                this.tools.draw.activate('line');
                break;

            case 'draw-polygon':
                this.activateTool('draw-polygon', btn);
                this.tools.draw.activate('polygon');
                break;

            case 'zoom-in':
                this.zoomShape(1.2);
                break;

            case 'zoom-out':
                this.zoomShape(0.8);
                break;

            case 'move':
                this.activateTool('move', btn);
                break;

            case 'rotate-left':
                this.rotateShape(-Math.PI / 12); // 逆时针 15 度
                break;

            case 'rotate-right':
                this.rotateShape(Math.PI / 12); // 顺时针 15 度
                break;

            // 辅助线工具
            case 'aux-connecting':
            case 'aux-median':
            case 'aux-altitude':
            case 'aux-perp-bisector':
            case 'aux-angle-bisector':
            case 'aux-parallel':
            case 'aux-perpendicular':
            case 'aux-midline':
            case 'aux-extension':
                this._activateAuxiliaryTool(tool, btn);
                break;

            case 'aux-undo':
                this.auxiliaryManager.removeLastAuxiliaryLine();
                this.render();
                break;

            case 'aux-clear':
                this.auxiliaryManager.clearAll();
                this.render();
                break;

            case 'animate':
                this.playAnimation();
                break;

            case 'screenshot':
                this.takeScreenshot();
                break;

            case 'save':
                this.saveToFile();
                break;

            case 'load':
                this.loadFromFile();
                break;

            case 'clear-all':
                this.clearAllData();
                break;

            case 'help':
                this.showHelp();
                break;
        }
    }

    // 显示帮助面板
    showHelp() {
        // 如果已存在，先移除
        const existingOverlay = document.querySelector('.help-overlay');
        const existingPanel = document.querySelector('.help-panel');
        if (existingOverlay) existingOverlay.remove();
        if (existingPanel) existingPanel.remove();

        // 创建遮罩
        const overlay = document.createElement('div');
        overlay.className = 'help-overlay show';
        overlay.addEventListener('click', () => this.hideHelp());

        // 创建帮助面板
        const panel = document.createElement('div');
        panel.className = 'help-panel show';
        panel.innerHTML = `
            <h3>📚 使用帮助</h3>

            <div class="help-section">
                <h4>键盘快捷键</h4>
                <div class="help-item">
                    <span class="help-key">Esc</span>
                    <span class="help-desc">取消当前操作</span>
                </div>
                <div class="help-item">
                    <span class="help-key">Enter</span>
                    <span class="help-desc">完成多边形绘制</span>
                </div>
                <div class="help-item">
                    <span class="help-key">H</span>
                    <span class="help-desc">显示/隐藏帮助</span>
                </div>
                <div class="help-item">
                    <span class="help-key">+ / -</span>
                    <span class="help-desc">放大/缩小图形</span>
                </div>
                <div class="help-item">
                    <span class="help-key">← / →</span>
                    <span class="help-desc">旋转图形</span>
                </div>
            </div>

            <div class="help-section">
                <h4>基本操作</h4>
                <div class="help-item">
                    <span class="help-key">拖拽顶点</span>
                    <span class="help-desc">改变图形形状</span>
                </div>
                <div class="help-item">
                    <span class="help-key">拖拽中心</span>
                    <span class="help-desc">旋转图形</span>
                </div>
                <div class="help-item">
                    <span class="help-key">双击</span>
                    <span class="help-desc">完成多边形绘制</span>
                </div>
            </div>

            <div class="help-section">
                <h4>辅助线操作</h4>
                <div class="help-item">
                    <span class="help-key">点击顶点</span>
                    <span class="help-desc">选择顶点创建辅助线</span>
                </div>
                <div class="help-item">
                    <span class="help-key">点击边</span>
                    <span class="help-desc">选择边创建辅助线</span>
                </div>
            </div>

            <div class="help-section">
                <h4>测量工具</h4>
                <div class="help-item">
                    <span class="help-key">距离</span>
                    <span class="help-desc">点击两点测量距离</span>
                </div>
                <div class="help-item">
                    <span class="help-key">角度</span>
                    <span class="help-desc">点击三点测量角度</span>
                </div>
            </div>

            <button class="close-help-btn" style="
                width: 100%;
                padding: 12px;
                margin-top: 20px;
                background: var(--primary-gradient);
                color: white;
                border: none;
                border-radius: var(--radius-md);
                cursor: pointer;
                font-size: 14px;
            ">关闭</button>
        `;

        panel.querySelector('.close-help-btn').addEventListener('click', () => this.hideHelp());

        document.body.appendChild(overlay);
        document.body.appendChild(panel);
    }

    // 隐藏帮助面板
    hideHelp() {
        const overlay = document.querySelector('.help-overlay');
        const panel = document.querySelector('.help-panel');
        if (overlay) overlay.remove();
        if (panel) panel.remove();
    }

    // 显示操作提示
    showHint(message, duration = 2000) {
        // 移除现有提示
        const existing = document.querySelector('.operation-hint');
        if (existing) existing.remove();

        const hint = document.createElement('div');
        hint.className = 'operation-hint';
        hint.textContent = message;
        document.body.appendChild(hint);

        // 显示动画
        setTimeout(() => hint.classList.add('show'), 10);

        // 自动隐藏
        setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => hint.remove(), 300);
        }, duration);
    }

    // 缩放图形
    zoomShape(factor) {
        if (!this.currentShape) return;

        if (this.currentShape.scale) {
            this.currentShape.scale(factor);
        }

        this.render();
        this.updateInfoPanel();
    }

    // 旋转图形
    rotateShape(angle) {
        if (!this.currentShape) return;

        if (this.currentShape.rotate) {
            this.currentShape.rotate(angle);
        }

        this.render();
        this.updateInfoPanel();
    }

    // 激活辅助线工具
    _activateAuxiliaryTool(tool, btn) {
        // 工具名到辅助线类型的映射
        const typeMap = {
            'aux-connecting': 'connecting',
            'aux-median': 'median',
            'aux-altitude': 'altitude',
            'aux-perp-bisector': 'perpendicular-bisector',
            'aux-angle-bisector': 'angle-bisector',
            'aux-parallel': 'parallel',
            'aux-perpendicular': 'perpendicular',
            'aux-midline': 'midline',
            'aux-extension': 'extension'
        };

        const auxType = typeMap[tool];
        if (!auxType) return;

        // 如果当前已有辅助线工具激活，先停用它
        if (this.activeTool && this.activeTool.startsWith('aux-')) {
            this.auxiliaryManager.deactivate();
        }

        // 激活工具（处理 UI 状态）
        this.activateTool(tool, btn);

        // 激活辅助线管理器
        if (!this.auxiliaryManager.activate(auxType)) {
            // 如果激活失败，停用工具
            this.deactivateTool();
        }
    }

    activateTool(toolName, btn) {
        const isAuxTool = toolName.startsWith('aux-');

        // 如果切换到不同工具，先清理之前的工具状态
        if (this.activeTool && this.activeTool !== toolName) {
            if (this.activeTool.startsWith('measure')) {
                this.tools.measure.deactivate();
            } else if (this.activeTool === 'move') {
                this.isMovingShape = false;
            } else if (this.activeTool.startsWith('draw')) {
                this.tools.draw.deactivate();
            }
            // 注意：辅助线工具的状态由 _activateAuxiliaryTool 管理，这里不处理

            // 移除之前的按钮高亮
            document.querySelectorAll('.tool-btn').forEach(b => {
                b.classList.remove('active');
            });
        }

        this.activeTool = toolName;
        if (btn) {
            btn.classList.add('active');
        }

        // 根据工具类型设置光标
        if (toolName === 'move') {
            this.engine.canvas.style.cursor = 'grab';
        } else {
            this.engine.canvas.style.cursor = 'crosshair';
        }

        // 设置引擎的拖拽交互状态
        if (isAuxTool || toolName.startsWith('draw') || toolName.startsWith('measure')) {
            this.engine.interactionEnabled = false;
        } else {
            this.engine.interactionEnabled = true;
        }
    }

    deactivateTool() {
        if (this.activeTool) {
            // 重置工具状态
            if (this.activeTool.startsWith('measure')) {
                this.tools.measure.deactivate();
            } else if (this.activeTool === 'move') {
                this.isMovingShape = false;
            } else if (this.activeTool.startsWith('draw')) {
                this.tools.draw.deactivate();
            } else if (this.activeTool.startsWith('aux-')) {
                // 辅助线工具
                this.auxiliaryManager.deactivate();
            }

            // 移除按钮高亮
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            this.activeTool = null;
            this.engine.canvas.style.cursor = 'crosshair';

            // 重新启用引擎的拖拽交互
            this.engine.interactionEnabled = true;

            this.render();
        }
    }

    handleCanvasClick(pos) {
        if (!this.activeTool) return;

        if (this.activeTool.startsWith('measure')) {
            this.tools.measure.addPoint(pos);
            this.render();
        } else if (this.activeTool.startsWith('draw')) {
            const shape = this.tools.draw.addPoint(pos);
            if (shape) {
                this.addDrawnShape(shape);
                if (this.activeTool !== 'draw-polygon') {
                    this.deactivateTool();
                }
            }
            this.render();
        } else if (this.activeTool.startsWith('aux-')) {
            // 辅助线工具
            const auxLine = this.auxiliaryManager.handleClick(pos);
            if (auxLine) {
                this._scheduleAutoSave(); // 保存辅助线变化
            }
            this.render();
        }
    }

    addDrawnShape(shapeData) {
        let shape;

        switch (shapeData.type) {
            case 'point':
                shape = createShape2D('point', { x: shapeData.x, y: shapeData.y });
                break;
            case 'segment':
                shape = createShape2D('segment', {
                    x1: shapeData.x1, y1: shapeData.y1,
                    x2: shapeData.x2, y2: shapeData.y2
                });
                break;
            case 'polygon-custom':
                // 创建自定义多边形 - 使用已导入的 createShape2D
                // 将点数组转换为正确的格式
                import('./shapes-2d.js').then(({ Polygon }) => {
                    const customShape = new Polygon(
                        shapeData.points.map(p => new Point(p.x, p.y)),
                        shapeData.points.length,
                        { isRegular: false }
                    );
                    this.engine.addShape(customShape);
                });
                return; // 异步处理，直接返回
        }

        if (shape) {
            this.engine.addShape(shape);
        }
    }

    // ========================================================================
    // 形状操作
    // ========================================================================
    resetShape() {
        // 清除本地存储
        this.clearLocalStorage();

        // 清除所有辅助线
        this.auxiliaryManager.clearAll();

        // 重置状态
        this.currentShape = null;

        // 获取当前选中的形状ID，如果没有则使用默认
        const shapeId = this.lastShapeId || 'triangle-equilateral';

        // 重新加载当前形状（会清除并重建）
        this.loadShape(shapeId);

        // 更新UI
        this.updateInfoPanel();
    }

    randomizeShape() {
        if (!this.currentShape) return;

        const canvas = this.engine.canvas;
        const margin = 50;

        if (this.currentShape.points) {
            // 2D 形状：随机移动顶点
            for (const p of this.currentShape.points) {
                p.x = margin + Math.random() * (canvas.width - 2 * margin);
                p.y = margin + Math.random() * (canvas.height - 2 * margin);
            }

            // 应用约束
            if (this.currentShape.applyConstraints) {
                this.currentShape.applyConstraints(0);
            }
        }

        this.render();
        this.updateInfoPanel();
    }

    playAnimation() {
        if (!this.currentShape) return;

        // 2D 旋转动画
        this.tools.animation.playRotation(this.currentShape, Math.PI * 2, 2000);
    }

    // ========================================================================
    // 信息面板
    // ========================================================================
    updateInfoPanel() {
        const infoPanel = document.getElementById('infoPanel');
        if (!infoPanel) return;

        if (!this.currentShape) {
            infoPanel.innerHTML = '<p class="no-shape">请选择一个图形</p>';
            return;
        }

        const shape = this.currentShape;
        const info = shape.info || {};

        let html = `
            <div class="info-header">
                <h3>${info.name || shape.type}</h3>
            </div>
        `;

        // 描述
        if (info.description) {
            html += `<p class="info-description">${info.description}</p>`;
        }

        // 公式区域
        const formulas = this._getShapeFormulas(shape);
        if (formulas.length > 0) {
            html += '<div class="info-formulas">';
            html += '<h4 class="formula-title">📚 公式</h4>';
            for (const formula of formulas) {
                html += `
                    <div class="formula-item">
                        <span class="formula-name">${formula.name}</span>
                        <span class="formula-value">${formula.formula}</span>
                    </div>
                `;
            }
            html += '</div>';
        }

        // 属性
        html += '<div class="info-properties">';

        // 周长
        if (shape.getPerimeter && typeof shape.getPerimeter === 'function') {
            const perimeter = shape.getPerimeter();
            if (perimeter > 0) {
                html += `
                    <div class="property">
                        <span class="property-label">周长</span>
                        <span class="property-value">${perimeter.toFixed(1)}</span>
                    </div>
                `;
            }
        }

        // 面积
        if (shape.getArea && typeof shape.getArea === 'function') {
            const area = shape.getArea();
            if (area > 0) {
                html += `
                    <div class="property">
                        <span class="property-label">面积</span>
                        <span class="property-value">${area.toFixed(1)}</span>
                    </div>
                `;
            }
        }

        // 角度
        if (shape.getAngles && typeof shape.getAngles === 'function') {
            const angles = shape.getAngles();
            if (angles.length > 0) {
                const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                html += '<div class="property-group"><span class="property-group-label">内角</span>';
                for (let i = 0; i < angles.length; i++) {
                    html += `
                        <div class="property small">
                            <span class="property-label">∠${labels[i]}</span>
                            <span class="property-value">${angles[i].toFixed(1)}°</span>
                        </div>
                    `;
                }
                html += '</div>';
            }
        }

        // 边长
        if (shape.getSides && typeof shape.getSides === 'function') {
            const sides = shape.getSides();
            if (sides.length > 0) {
                const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                html += '<div class="property-group"><span class="property-group-label">边长</span>';
                for (let i = 0; i < sides.length; i++) {
                    const nextI = (i + 1) % sides.length;
                    html += `
                        <div class="property small">
                            <span class="property-label">${labels[i]}${labels[nextI]}</span>
                            <span class="property-value">${sides[i].toFixed(1)}</span>
                        </div>
                    `;
                }
                html += '</div>';
            }
        }

        html += '</div>';

        infoPanel.innerHTML = html;
    }

    // 获取形状的数学公式
    _getShapeFormulas(shape) {
        const type = shape.type;
        const subType = shape.subType || '';

        const formulas = [];

        switch (type) {
            case 'triangle':
                formulas.push(
                    { name: '面积', formula: 'S = ½ × 底 × 高' },
                    { name: '周长', formula: 'C = a + b + c' },
                    { name: '内角和', formula: '∠A + ∠B + ∠C = 180°' }
                );
                if (subType === 'equilateral') {
                    formulas.push({ name: '等边三角形面积', formula: 'S = (√3/4) × a²' });
                } else if (subType === 'right') {
                    formulas.push({ name: '勾股定理', formula: 'a² + b² = c²' });
                }
                break;

            case 'quadrilateral':
                switch (subType) {
                    case 'square':
                        formulas.push(
                            { name: '面积', formula: 'S = a²' },
                            { name: '周长', formula: 'C = 4a' },
                            { name: '对角线', formula: 'd = √2 × a' }
                        );
                        break;
                    case 'rectangle':
                        formulas.push(
                            { name: '面积', formula: 'S = a × b' },
                            { name: '周长', formula: 'C = 2(a + b)' },
                            { name: '对角线', formula: 'd = √(a² + b²)' }
                        );
                        break;
                    case 'parallelogram':
                        formulas.push(
                            { name: '面积', formula: 'S = 底 × 高' },
                            { name: '周长', formula: 'C = 2(a + b)' },
                            { name: '性质', formula: '对边相等且平行' }
                        );
                        break;
                    case 'rhombus':
                        formulas.push(
                            { name: '面积', formula: 'S = ½ × d₁ × d₂' },
                            { name: '周长', formula: 'C = 4a' },
                            { name: '性质', formula: '四边相等，对角线互相垂直平分' }
                        );
                        break;
                    case 'trapezoid':
                        formulas.push(
                            { name: '面积', formula: 'S = ½(a + b) × h' },
                            { name: '中位线', formula: 'm = (a + b) / 2' }
                        );
                        break;
                    case 'kite':
                        formulas.push(
                            { name: '面积', formula: 'S = ½ × d₁ × d₂' },
                            { name: '性质', formula: '两组邻边分别相等' }
                        );
                        break;
                    default:
                        formulas.push(
                            { name: '内角和', formula: '∠之和 = 360°' }
                        );
                }
                break;

            case 'circle':
                formulas.push(
                    { name: '面积', formula: 'S = πr²' },
                    { name: '周长', formula: 'C = 2πr' },
                    { name: '直径', formula: 'd = 2r' }
                );
                if (subType === 'sector') {
                    formulas.push(
                        { name: '扇形面积', formula: 'S = (θ/360°) × πr²' },
                        { name: '弧长', formula: 'L = (θ/360°) × 2πr' }
                    );
                }
                break;

            case 'polygon':
                const n = shape.points?.length || 0;
                formulas.push(
                    { name: '内角和', formula: `(n-2) × 180° = ${(n - 2) * 180}°` },
                    { name: '外角和', formula: '360°' }
                );
                if (shape.isRegular) {
                    formulas.push({ name: '每个内角', formula: `${((n - 2) * 180 / n).toFixed(1)}°` });
                }
                break;

            case 'line':
                formulas.push(
                    { name: '两点间距离', formula: 'd = √[(x₂-x₁)² + (y₂-y₁)²]' },
                    { name: '中点坐标', formula: 'M = ((x₁+x₂)/2, (y₁+y₂)/2)' }
                );
                break;
        }

        return formulas;
    }

    showMeasureResult(data) {
        const toast = document.createElement('div');
        toast.className = 'measure-toast';

        if (data.type === 'distance') {
            toast.innerHTML = `📏 距离: <strong>${data.value.toFixed(1)}</strong>`;
        } else if (data.type === 'angle') {
            toast.innerHTML = `📐 角度: <strong>${data.value.toFixed(1)}°</strong>`;
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========================================================================
    // 保存/加载
    // ========================================================================
    takeScreenshot() {
        const canvas = this.engine.canvas;
        const link = document.createElement('a');
        link.download = `geometry-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    saveToFile() {
        const data = this.engine.save();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `geometry-${Date.now()}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    loadFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.engine.load(data, (shapeData) => {
                        return shapeFromJSON(shapeData);
                    });

                    // 选中第一个形状
                    const shapes = Array.from(this.engine.shapes.values());
                    if (shapes.length > 0) {
                        this.currentShape = shapes[0];
                        this.engine.selectShape(this.currentShape);
                    }

                    this.updateInfoPanel();
                } catch (err) {
                    console.error('Failed to load file:', err);
                    alert('加载失败：文件格式错误');
                }
            };

            reader.readAsText(file);
        });

        input.click();
    }

    // ========================================================================
    // 渲染
    // ========================================================================
    render() {
        const ctx = this.engine.ctx;
        const canvas = this.engine.canvas;

        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制网格
        if (this.engine.showOptions.grid) {
            this.drawGrid();
        }

        // 绘制形状
        for (const shape of this.engine.shapes.values()) {
            if (shape.visible) {
                shape.draw(ctx, {
                    showAngles: this.engine.showOptions.angles,
                    showSides: this.engine.showOptions.sides,
                    showDiagonals: this.engine.showOptions.diagonals
                });
            }
        }

        // 绘制辅助线
        this.auxiliaryManager.draw(ctx);

        // 绘制测量工具
        if (this.tools.measure.isActive) {
            this.tools.measure.draw(ctx);
        }

        // 绘制绘图工具
        if (this.tools.draw.isActive) {
            this.tools.draw.draw(ctx);
        }
    }

    drawGrid() {
        const ctx = this.engine.ctx;
        const canvas = this.engine.canvas;
        const gridSize = 50;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    resizeCanvas() {
        const canvas = this.engine.canvas;
        const container = canvas.parentElement;

        if (container) {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // 重新设置高 DPI
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            this.render();
        }
    }

    // ========================================================================
    // 本地存储（自动保存/恢复）
    // ========================================================================

    // 延迟自动保存（防抖）
    _scheduleAutoSave() {
        if (this._autoSaveTimer) {
            clearTimeout(this._autoSaveTimer);
        }
        this._autoSaveTimer = setTimeout(() => {
            this._saveToLocalStorage();
        }, AUTO_SAVE_DELAY);
    }

    // 保存到本地存储
    _saveToLocalStorage() {
        try {
            const state = {
                lastShapeId: this.lastShapeId,
                engineState: this.engine.save(),
                auxiliaryLines: this.auxiliaryManager.toJSON(),
                showOptions: { ...this.engine.showOptions },
                expandedCategories: Array.from(this.expandedCategories),
                timestamp: Date.now()
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            console.log('State saved to localStorage');
        } catch (err) {
            console.warn('Failed to save state to localStorage:', err);
        }
    }

    // 从本地存储加载
    _loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return false;

            const state = JSON.parse(saved);

            // 恢复形状ID
            this.lastShapeId = state.lastShapeId;

            // 恢复展开的分类
            if (state.expandedCategories) {
                this.expandedCategories = new Set(state.expandedCategories);
            }

            // 恢复显示选项
            if (state.showOptions) {
                Object.assign(this.engine.showOptions, state.showOptions);
                this._syncShowOptionsUI();
            }

            // 恢复引擎状态（形状）
            if (state.engineState) {
                this.engine.load(state.engineState, (shapeData) => {
                    return shapeFromJSON(shapeData);
                });

                // 恢复辅助线
                if (state.auxiliaryLines) {
                    this.auxiliaryManager.loadFromJSON(state.auxiliaryLines, (id) => this.engine.getShape(id));
                }

                // 选中第一个形状
                const shapes = Array.from(this.engine.shapes.values());
                if (shapes.length > 0) {
                    this.currentShape = shapes[0];
                    this.engine.selectShape(this.currentShape);
                }

                // 更新侧边栏选中状态
                this._updateSidebarSelection();

                this.render();
                console.log('State restored from localStorage');
                return true;
            }

            return false;
        } catch (err) {
            console.warn('Failed to load state from localStorage:', err);
            return false;
        }
    }

    // 同步显示选项到 UI
    _syncShowOptionsUI() {
        const checkboxes = document.querySelectorAll('.display-option input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const option = checkbox.dataset.option;
            if (option && this.engine.showOptions[option] !== undefined) {
                checkbox.checked = this.engine.showOptions[option];
            }
        });
    }

    // 更新侧边栏选中状态
    _updateSidebarSelection() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || !this.lastShapeId) return;

        sidebar.querySelectorAll('.shape-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.shape === this.lastShapeId) {
                item.classList.add('active');
            }
        });
    }

    // 清除所有数据（包括本地存储）
    clearAllData() {
        // 确认对话框
        if (!confirm('确定要清除所有数据吗？此操作不可恢复。')) {
            return;
        }

        // 清除本地存储
        this.clearLocalStorage();

        // 清除所有形状
        this.engine.clearShapes();

        // 清除所有辅助线
        this.auxiliaryManager.clearAll();

        // 重置状态
        this.currentShape = null;
        this.lastShapeId = null;

        // 更新UI
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.querySelectorAll('.shape-item').forEach(item => {
                item.classList.remove('active');
            });
        }

        // 重新渲染
        this.render();
        this.updateInfoPanel();

        console.log('All data cleared');
    }

    // 清除本地存储
    clearLocalStorage() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('LocalStorage cleared');
        } catch (err) {
            console.warn('Failed to clear localStorage:', err);
        }
    }
}

// ============================================================================
// 启动应用
// ============================================================================
const app = new GeometryApp();

// 导出到全局（方便调试）
window.geometryApp = app;
