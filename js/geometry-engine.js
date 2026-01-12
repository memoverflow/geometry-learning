/**
 * 几何引擎核心模块
 * 包含 Point, Vector, Matrix, Shape 基类和 GeometryEngine 主引擎
 */

// ============================================================================
// Point 类 - 2D 点
// ============================================================================
export class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Point(this.x, this.y);
    }

    distanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static midpoint(p1, p2) {
        return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }

    toJSON() {
        return { x: this.x, y: this.y };
    }

    static fromJSON(data) {
        return new Point(data.x, data.y);
    }
}

// ============================================================================
// Vector 类 - 2D 向量运算
// ============================================================================
export class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromPoints(p1, p2) {
        return new Vector(p2.x - p1.x, p2.y - p1.y);
    }

    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const len = this.length;
        if (len === 0) return new Vector(0, 0);
        return new Vector(this.x / len, this.y / len);
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    // 2D 叉积（返回标量）
    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    // 计算两个向量之间的夹角（弧度）
    angleTo(v) {
        const dot = this.dot(v);
        const len1 = this.length;
        const len2 = v.length;
        if (len1 === 0 || len2 === 0) return 0;
        let cos = dot / (len1 * len2);
        cos = Math.max(-1, Math.min(1, cos)); // 防止浮点误差
        return Math.acos(cos);
    }
}

// ============================================================================
// Matrix 类 - 变换矩阵（4x4）
// ============================================================================
export class Matrix {
    constructor(data = null) {
        // 4x4 矩阵，行优先存储
        this.data = data || [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    static identity() {
        return new Matrix();
    }

    static translation(tx, ty, tz = 0) {
        return new Matrix([
            1, 0, 0, tx,
            0, 1, 0, ty,
            0, 0, 1, tz,
            0, 0, 0, 1
        ]);
    }

    static scale(sx, sy, sz = 1) {
        return new Matrix([
            sx, 0, 0, 0,
            0, sy, 0, 0,
            0, 0, sz, 0,
            0, 0, 0, 1
        ]);
    }

    static rotationX(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix([
            1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1
        ]);
    }

    static rotationY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix([
            c, 0, s, 0,
            0, 1, 0, 0,
            -s, 0, c, 0,
            0, 0, 0, 1
        ]);
    }

    static rotationZ(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix([
            c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    multiply(m) {
        const a = this.data;
        const b = m.data;
        const result = new Array(16);

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                let sum = 0;
                for (let i = 0; i < 4; i++) {
                    sum += a[row * 4 + i] * b[i * 4 + col];
                }
                result[row * 4 + col] = sum;
            }
        }

        return new Matrix(result);
    }

    transformPoint(p) {
        const x = p.x, y = p.y, z = p.z ?? 0;
        const d = this.data;

        const newX = d[0] * x + d[1] * y + d[2] * z + d[3];
        const newY = d[4] * x + d[5] * y + d[6] * z + d[7];
        const newZ = d[8] * x + d[9] * y + d[10] * z + d[11];
        const w = d[12] * x + d[13] * y + d[14] * z + d[15];

        if (p.z !== null) {
            return new Point(newX / w, newY / w, newZ / w);
        }
        return new Point(newX / w, newY / w);
    }
}

// ============================================================================
// Shape 基类 - 所有形状的父类
// ============================================================================
let shapeIdCounter = 0;

export class Shape {
    constructor(type, options = {}) {
        this.id = `shape_${++shapeIdCounter}`;
        this.type = type;
        this.points = [];
        this.style = {
            fillColor: 'rgba(102, 126, 234, 0.2)',
            strokeColor: '#667eea',
            lineWidth: 3,
            pointColor: '#764ba2',
            pointRadius: 12,
            labelColor: '#374151',
            ...options.style
        };
        this.info = {
            name: type,
            description: '',
            ...options.info
        };
        this.visible = true;
        this.selected = false;
        this.draggable = true;
    }

    // 获取中心点
    getCenter() {
        if (this.points.length === 0) return new Point(0, 0);

        let sumX = 0, sumY = 0;
        for (const p of this.points) {
            sumX += p.x;
            sumY += p.y;
        }

        const n = this.points.length;
        return new Point(sumX / n, sumY / n);
    }

    // 获取边界框
    getBounds() {
        if (this.points.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const p of this.points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        return { minX, minY, maxX, maxY };
    }

    // 检查点是否在形状内（子类重写）
    contains(point) {
        return false;
    }

    // 检查点是否在某个顶点附近
    findPointAt(pos, tolerance = 15) {
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const dist = Math.sqrt(
                Math.pow(pos.x - p.x, 2) + Math.pow(pos.y - p.y, 2)
            );
            if (dist <= tolerance) {
                return i;
            }
        }
        return -1;
    }

    // 应用约束（子类重写）
    applyConstraints(draggedIndex) {
        // 默认无约束
    }

    // 旋转所有点
    rotate(angle, center = null) {
        const c = center || this.getCenter();
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for (const p of this.points) {
            const dx = p.x - c.x;
            const dy = p.y - c.y;
            p.x = c.x + dx * cos - dy * sin;
            p.y = c.y + dx * sin + dy * cos;
        }
    }

    // 平移所有点
    translate(dx, dy) {
        for (const p of this.points) {
            p.x += dx;
            p.y += dy;
        }
    }

    // 缩放所有点
    scale(factor, center = null) {
        const c = center || this.getCenter();

        for (const p of this.points) {
            p.x = c.x + (p.x - c.x) * factor;
            p.y = c.y + (p.y - c.y) * factor;
        }
    }

    // 计算属性（子类重写）
    getPerimeter() { return 0; }
    getArea() { return 0; }
    getVolume() { return 0; }
    getAngles() { return []; }

    // 绘制（子类重写）
    draw(renderer, options = {}) {
        // 由子类实现
    }

    // 序列化
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            points: this.points.map(p => p.toJSON()),
            style: { ...this.style },
            info: { ...this.info },
            visible: this.visible,
            draggable: this.draggable
        };
    }

    // 反序列化（由子类实现工厂方法）
    static fromJSON(data) {
        throw new Error('fromJSON must be implemented by subclass');
    }
}

// ============================================================================
// GeometryEngine - 几何引擎主类
// ============================================================================
export class GeometryEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shapes = new Map();

        // 交互状态
        this.selectedShape = null;
        this.draggingPointIndex = -1;
        this.isRotating = false;
        this.lastMousePos = null;
        this.interactionEnabled = true; // 是否启用拖拽/旋转交互

        // 事件监听器
        this.listeners = {
            select: [],
            change: [],
            measure: []
        };

        // 显示选项
        this.showOptions = {
            angles: true,
            sides: true,
            diagonals: false,
            grid: true
        };

        // 绑定事件
        this._bindEvents();
    }

    addShape(shape) {
        this.shapes.set(shape.id, shape);
        this.render();
        return shape;
    }

    removeShape(id) {
        this.shapes.delete(id);
        if (this.selectedShape?.id === id) {
            this.selectedShape = null;
        }
        this.render();
    }

    getShape(id) {
        return this.shapes.get(id);
    }

    clearShapes() {
        this.shapes.clear();
        this.selectedShape = null;
        this.render();
    }

    selectShape(shape) {
        if (this.selectedShape) {
            this.selectedShape.selected = false;
        }
        this.selectedShape = shape;
        if (shape) {
            shape.selected = true;
        }
        this._emit('select', shape);
        this.render();
    }

    // 渲染所有形状
    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 绘制网格（如果启用）
        if (this.showOptions.grid) {
            this._drawGrid();
        }

        // 绘制所有形状
        for (const shape of this.shapes.values()) {
            if (shape.visible) {
                shape.draw(ctx, {
                    showAngles: this.showOptions.angles,
                    showSides: this.showOptions.sides,
                    showDiagonals: this.showOptions.diagonals
                });
            }
        }
    }

    _drawGrid() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const gridSize = 50;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        // 垂直线
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // 水平线
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    // 事件绑定
    _bindEvents() {
        const canvas = this.canvas;

        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        canvas.addEventListener('mouseleave', (e) => this._onMouseLeave(e));

        // 触摸事件
        canvas.addEventListener('touchstart', (e) => this._onTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this._onTouchMove(e));
        canvas.addEventListener('touchend', (e) => this._onTouchEnd(e));
    }

    _getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        // 由于 ctx.scale(dpr, dpr) 已经处理了缩放，这里直接使用 CSS 坐标
        return new Point(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
    }

    _onMouseDown(e) {
        const pos = this._getMousePos(e);
        this.lastMousePos = pos;

        // 如果交互被禁用（例如正在使用辅助线工具），不处理拖拽
        if (!this.interactionEnabled) {
            return;
        }

        // 查找点击的形状和顶点
        for (const shape of this.shapes.values()) {
            if (!shape.draggable) continue;

            // 检查是否点击了旋转中心
            const center = shape.getCenter();
            if (pos.distanceTo(center) <= 20) {
                this.isRotating = true;
                this.selectedShape = shape;
                this.canvas.style.cursor = 'grabbing';
                return;
            }

            // 检查是否点击了顶点
            const pointIndex = shape.findPointAt(pos);
            if (pointIndex >= 0) {
                this.selectedShape = shape;
                this.draggingPointIndex = pointIndex;
                this.canvas.style.cursor = 'grabbing';
                this.selectShape(shape);
                return;
            }

            // 检查是否点击了形状内部
            if (shape.contains(pos)) {
                this.selectShape(shape);
                return;
            }
        }

        // 没有点击任何形状
        this.selectShape(null);
    }

    _onMouseMove(e) {
        const pos = this._getMousePos(e);

        if (this.isRotating && this.selectedShape) {
            const center = this.selectedShape.getCenter();
            const prevAngle = Math.atan2(
                this.lastMousePos.y - center.y,
                this.lastMousePos.x - center.x
            );
            const currAngle = Math.atan2(
                pos.y - center.y,
                pos.x - center.x
            );
            this.selectedShape.rotate(currAngle - prevAngle);
            this.lastMousePos = pos;
            this._emit('change', this.selectedShape);
            // 不在这里调用 render，由 app.js 统一渲染
            // this.render();
            return;
        }

        if (this.draggingPointIndex >= 0 && this.selectedShape) {
            const shape = this.selectedShape;
            const point = shape.points[this.draggingPointIndex];

            // 限制在画布内（使用 CSS 尺寸）
            const rect = this.canvas.getBoundingClientRect();
            point.x = Math.max(20, Math.min(rect.width - 20, pos.x));
            point.y = Math.max(20, Math.min(rect.height - 20, pos.y));

            // 应用约束
            shape.applyConstraints(this.draggingPointIndex);

            this._emit('change', shape);
            // 不在这里调用 render，由 app.js 统一渲染
            // this.render();
            return;
        }

        // 更新鼠标样式
        let cursor = 'crosshair';
        for (const shape of this.shapes.values()) {
            if (!shape.draggable) continue;

            const center = shape.getCenter();
            if (pos.distanceTo(center) <= 20) {
                cursor = 'grab';
                break;
            }

            if (shape.findPointAt(pos) >= 0) {
                cursor = 'grab';
                break;
            }
        }
        this.canvas.style.cursor = cursor;
    }

    _onMouseUp(e) {
        this.draggingPointIndex = -1;
        this.isRotating = false;
        this.canvas.style.cursor = 'crosshair';
    }

    _onMouseLeave(e) {
        this.draggingPointIndex = -1;
        this.isRotating = false;
    }

    _onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this._onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this._onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    _onTouchEnd(e) {
        e.preventDefault();
        this._onMouseUp(e);
    }

    // 事件系统
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index >= 0) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    _emit(event, data) {
        if (this.listeners[event]) {
            for (const callback of this.listeners[event]) {
                callback(data);
            }
        }
    }

    // 持久化
    save() {
        return {
            showOptions: { ...this.showOptions },
            shapes: Array.from(this.shapes.values()).map(s => s.toJSON())
        };
    }

    load(data, shapeFactory) {
        this.showOptions = { ...this.showOptions, ...data.showOptions };

        this.clearShapes();

        if (data.shapes && shapeFactory) {
            for (const shapeData of data.shapes) {
                const shape = shapeFactory(shapeData);
                if (shape) {
                    this.addShape(shape);
                }
            }
        }
    }
}

// ============================================================================
// 工具函数
// ============================================================================
export const GeometryUtils = {
    // 角度转弧度
    degToRad(deg) {
        return deg * Math.PI / 180;
    },

    // 弧度转角度
    radToDeg(rad) {
        return rad * 180 / Math.PI;
    },

    // 计算三点形成的角度（弧度）
    angleFromThreePoints(p1, p2, p3) {
        const v1 = Vector.fromPoints(p2, p1);
        const v2 = Vector.fromPoints(p2, p3);
        return v1.angleTo(v2);
    },

    // 计算多边形面积（鞋带公式）
    polygonArea(points) {
        let area = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area / 2);
    },

    // 计算多边形周长
    polygonPerimeter(points) {
        let perimeter = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            perimeter += points[i].distanceTo(points[j]);
        }
        return perimeter;
    },

    // 检查点是否在多边形内（射线法）
    pointInPolygon(point, polygon) {
        let inside = false;
        const n = polygon.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    },

    // 生成正多边形的顶点
    regularPolygonPoints(center, radius, sides, startAngle = -Math.PI / 2) {
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + (2 * Math.PI * i) / sides;
            points.push(new Point(
                center.x + radius * Math.cos(angle),
                center.y + radius * Math.sin(angle)
            ));
        }
        return points;
    }
};
