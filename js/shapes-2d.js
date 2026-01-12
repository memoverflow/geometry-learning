/**
 * 2D 形状模块
 * 包含所有 2D 平面图形类
 */

import { Point, Vector, Shape, GeometryUtils } from './geometry-engine.js';
import { Renderer2D } from './renderer.js';

// ============================================================================
// Point2D - 2D 点（作为独立元素）
// ============================================================================
export class Point2D extends Shape {
    constructor(x, y, options = {}) {
        super('point', options);
        this.points = [new Point(x, y)];
        this.info = {
            name: '点',
            description: '点是几何中最基本的元素，表示空间中的一个位置，没有大小。',
            ...options.info
        };
    }

    draw(ctx, options = {}) {
        const p = this.points[0];
        const renderer = new Renderer2D(ctx);

        renderer.drawPoint(p, {
            radius: this.style.pointRadius,
            color: this.style.pointColor,
            label: options.label || 'P',
            isSelected: this.selected
        });
    }

    contains(point) {
        return this.points[0].distanceTo(point) <= this.style.pointRadius;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            x: this.points[0].x,
            y: this.points[0].y
        };
    }

    static fromJSON(data) {
        const point = new Point2D(data.x, data.y, {
            style: data.style,
            info: data.info
        });
        point.id = data.id;
        return point;
    }
}

// ============================================================================
// Line2D - 2D 线（线段/射线/直线）
// ============================================================================
export class Line2D extends Shape {
    constructor(p1, p2, lineType = 'segment', options = {}) {
        super('line', options);
        this.points = [
            p1 instanceof Point ? p1 : new Point(p1.x, p1.y),
            p2 instanceof Point ? p2 : new Point(p2.x, p2.y)
        ];
        this.lineType = lineType; // 'segment', 'ray', 'line'

        const names = {
            segment: '线段',
            ray: '射线',
            line: '直线'
        };

        this.info = {
            name: names[lineType] || '线段',
            description: this._getDescription(lineType),
            ...options.info
        };
    }

    _getDescription(type) {
        const descriptions = {
            segment: '线段是连接两点之间的直线部分，有确定的长度。',
            ray: '射线是从一点出发，沿一个方向无限延伸的线。',
            line: '直线是向两个方向无限延伸的线，没有端点。'
        };
        return descriptions[type] || descriptions.segment;
    }

    getLength() {
        return this.points[0].distanceTo(this.points[1]);
    }

    getPerimeter() {
        return this.getLength();
    }

    draw(ctx, options = {}) {
        const renderer = new Renderer2D(ctx);
        const [p1, p2] = this.points;

        // 对于射线和直线，需要延伸到画布边界
        let drawP1 = p1, drawP2 = p2;

        if (this.lineType === 'line' || this.lineType === 'ray') {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > 0) {
                const extendLength = 2000; // 足够长以超出画布
                const unitX = dx / len;
                const unitY = dy / len;

                if (this.lineType === 'line') {
                    drawP1 = new Point(p1.x - unitX * extendLength, p1.y - unitY * extendLength);
                }
                drawP2 = new Point(p2.x + unitX * extendLength, p2.y + unitY * extendLength);
            }
        }

        // 绘制线
        renderer.drawLine(drawP1, drawP2, {
            color: this.style.strokeColor,
            lineWidth: this.style.lineWidth
        });

        // 绘制端点
        renderer.drawPoint(p1, {
            radius: this.style.pointRadius,
            color: this.style.pointColor,
            label: 'A'
        });

        if (this.lineType === 'segment') {
            renderer.drawPoint(p2, {
                radius: this.style.pointRadius,
                color: this.style.pointColor,
                label: 'B'
            });
        }

        // 显示长度（仅线段）
        if (options.showSides && this.lineType === 'segment') {
            renderer.drawSideLength(p1, p2, this.getLength(), {
                color: this.style.strokeColor
            });
        }

        // 绘制旋转控制点（可选）
        if (options.showRotateHandle) {
            const center = this.getCenter();
            renderer.drawRotateHandle(center, {
                isHovered: options.hoveredCenter,
                isActive: options.isRotating
            });
        }
    }

    contains(point) {
        // 检查点是否在线段上（带容差）
        const [p1, p2] = this.points;
        const d1 = point.distanceTo(p1);
        const d2 = point.distanceTo(p2);
        const lineLen = p1.distanceTo(p2);
        const tolerance = 5;

        return Math.abs(d1 + d2 - lineLen) < tolerance;
    }

    static fromJSON(data) {
        const line = new Line2D(
            new Point(data.points[0].x, data.points[0].y),
            new Point(data.points[1].x, data.points[1].y),
            data.lineType || 'segment',
            { style: data.style, info: data.info }
        );
        line.id = data.id;
        return line;
    }
}

// ============================================================================
// Triangle - 三角形
// ============================================================================
export class Triangle extends Shape {
    constructor(points, triangleType = 'any', options = {}) {
        super('triangle', options);

        if (points && points.length === 3) {
            this.points = points.map(p => p instanceof Point ? p : new Point(p.x, p.y));
        } else {
            // 默认创建等边三角形
            const center = new Point(250, 200);
            const radius = 100;
            this.points = GeometryUtils.regularPolygonPoints(center, radius, 3);
        }

        this.triangleType = triangleType;

        const names = {
            any: '任意三角形',
            isosceles: '等腰三角形',
            equilateral: '等边三角形',
            right: '直角三角形'
        };

        this.info = {
            name: names[triangleType] || '三角形',
            description: this._getDescription(triangleType),
            ...options.info
        };
    }

    _getDescription(type) {
        const descriptions = {
            any: '三角形是由三条线段首尾相连组成的封闭图形。内角和为180°。',
            isosceles: '等腰三角形有两条边相等，两个底角也相等。',
            equilateral: '等边三角形三条边都相等，三个角都是60°。',
            right: '直角三角形有一个角是90°。满足勾股定理：a² + b² = c²。'
        };
        return descriptions[type] || descriptions.any;
    }

    getPerimeter() {
        return GeometryUtils.polygonPerimeter(this.points);
    }

    getArea() {
        return GeometryUtils.polygonArea(this.points);
    }

    getAngles() {
        const angles = [];
        for (let i = 0; i < 3; i++) {
            const prev = this.points[(i + 2) % 3];
            const curr = this.points[i];
            const next = this.points[(i + 1) % 3];
            const angle = GeometryUtils.angleFromThreePoints(prev, curr, next);
            angles.push(GeometryUtils.radToDeg(angle));
        }
        return angles;
    }

    getSides() {
        const sides = [];
        for (let i = 0; i < 3; i++) {
            sides.push(this.points[i].distanceTo(this.points[(i + 1) % 3]));
        }
        return sides;
    }

    applyConstraints(draggedIndex) {
        if (this.triangleType === 'any') return;

        const idx = draggedIndex;

        switch (this.triangleType) {
            case 'equilateral':
                this._applyEquilateralConstraint(idx);
                break;
            case 'isosceles':
                this._applyIsoscelesConstraint(idx);
                break;
            case 'right':
                this._applyRightConstraint(idx);
                break;
        }
    }

    _applyEquilateralConstraint(idx) {
        // 等边三角形：保持三边相等
        // 使用拖动点和对边中点来计算新的中心和半径
        const draggedPoint = this.points[idx];

        // 获取另外两个点的索引
        const other1 = (idx + 1) % 3;
        const other2 = (idx + 2) % 3;

        // 计算对边中点
        const oppositeMid = Point.midpoint(this.points[other1], this.points[other2]);

        // 等边三角形中，顶点到对边中点的距离是边长的 √3/2 倍
        // 中心到顶点的距离是边长的 √3/3 倍
        // 所以顶点到中心的距离 = (顶点到对边中点距离) * (2/3)
        const heightDist = draggedPoint.distanceTo(oppositeMid);

        // 防止坍缩：如果高度太小，保持最小值
        if (heightDist < 20) {
            return;
        }

        // 中心位于顶点到对边中点的连线上，距顶点 2/3 处
        const centerX = draggedPoint.x + (oppositeMid.x - draggedPoint.x) * (2 / 3);
        const centerY = draggedPoint.y + (oppositeMid.y - draggedPoint.y) * (2 / 3);
        const center = new Point(centerX, centerY);

        // 外接圆半径
        const radius = draggedPoint.distanceTo(center);

        // 计算拖动点相对于中心的角度
        const draggedAngle = Math.atan2(
            draggedPoint.y - center.y,
            draggedPoint.x - center.x
        );

        // 重新生成等边三角形，确保拖动的点保持在正确位置
        // 点 i 相对于拖动点 idx 的角度偏移为 (i - idx) * 2π/3
        for (let i = 0; i < 3; i++) {
            const angleOffset = ((i - idx + 3) % 3) * (2 * Math.PI / 3);
            const angle = draggedAngle + angleOffset;
            this.points[i].x = center.x + radius * Math.cos(angle);
            this.points[i].y = center.y + radius * Math.sin(angle);
        }
    }

    _applyIsoscelesConstraint(idx) {
        // 等腰三角形：保持两边相等（A-B 和 A-C 相等，A 是顶点）
        // 等腰三角形的对称轴是从顶点 A 到底边 BC 中点的连线

        if (idx === 0) {
            // 拖动顶点 A，保持两腰相等
            // 计算当前底边中点
            const midBase = Point.midpoint(this.points[1], this.points[2]);
            // 计算对称轴方向（从底边中点到顶点）
            const axisDir = Vector.fromPoints(midBase, this.points[0]);
            const axisLen = axisDir.length;

            if (axisLen < 10) return; // 防止坍缩

            // 两腰的平均长度
            const distAB = this.points[0].distanceTo(this.points[1]);
            const distAC = this.points[0].distanceTo(this.points[2]);
            const avgDist = (distAB + distAC) / 2;

            // 保持方向不变，调整长度
            for (let i = 1; i <= 2; i++) {
                const dir = Vector.fromPoints(this.points[0], this.points[i]).normalize();
                if (dir.length > 0) {
                    this.points[i].x = this.points[0].x + dir.x * avgDist;
                    this.points[i].y = this.points[0].y + dir.y * avgDist;
                }
            }
        } else {
            // 拖动底边顶点 B 或 C
            // 对称轴是从顶点 A 到底边中点的连线
            const other = idx === 1 ? 2 : 1;
            const apex = this.points[0]; // 顶点
            const draggedPoint = this.points[idx]; // 被拖动的点

            // 计算对称轴方向（顶点到被拖动点与另一点的中点）
            // 为了保持等腰，另一点应该是被拖动点关于对称轴的对称点

            // 先计算当前对称轴：从顶点指向当前底边中点
            const currentMid = Point.midpoint(this.points[1], this.points[2]);
            let axisDir = Vector.fromPoints(apex, currentMid);

            // 如果底边中点和顶点重合，使用垂直于拖动方向的轴
            if (axisDir.length < 1) {
                const dragDir = Vector.fromPoints(apex, draggedPoint);
                axisDir = new Vector(-dragDir.y, dragDir.x);
            }

            const axisLen = axisDir.length;
            if (axisLen < 0.001) return;

            // 归一化对称轴方向
            const axisUnit = axisDir.normalize();

            // 计算被拖动点相对于顶点的向量
            const toPoint = Vector.fromPoints(apex, draggedPoint);

            // 在对称轴上的投影
            const projLength = toPoint.x * axisUnit.x + toPoint.y * axisUnit.y;

            // 垂直分量
            const perpLength = toPoint.x * (-axisUnit.y) + toPoint.y * axisUnit.x;

            // 对称点：沿对称轴方向相同，垂直方向相反
            this.points[other].x = apex.x + projLength * axisUnit.x - perpLength * (-axisUnit.y);
            this.points[other].y = apex.y + projLength * axisUnit.y - perpLength * axisUnit.x;
        }
    }

    _applyRightConstraint(idx) {
        // 直角三角形：保持 A 点为直角
        if (idx === 0) {
            // 移动直角顶点，保持垂直关系
            const v1 = Vector.fromPoints(this.points[0], this.points[1]);
            const v2 = Vector.fromPoints(this.points[0], this.points[2]);

            // 使 v2 垂直于 v1
            const perpendicular = new Vector(-v1.y, v1.x);
            const len2 = v2.length;
            const norm = perpendicular.normalize();

            this.points[2].x = this.points[0].x + norm.x * len2;
            this.points[2].y = this.points[0].y + norm.y * len2;
        }
    }

    contains(point) {
        return GeometryUtils.pointInPolygon(point, this.points);
    }

    draw(ctx, options = {}) {
        const renderer = new Renderer2D(ctx);

        // 绘制填充和边框
        renderer.drawPolygon(this.points, {
            fillColor: this.style.fillColor,
            strokeColor: this.style.strokeColor,
            lineWidth: this.style.lineWidth
        });

        // 绘制角度
        if (options.showAngles) {
            const angles = this.getAngles();
            for (let i = 0; i < 3; i++) {
                const prev = this.points[(i + 2) % 3];
                const curr = this.points[i];
                const next = this.points[(i + 1) % 3];

                renderer.drawAngle(curr, prev, next, angles[i], {
                    fillColor: this.style.angleColor || 'rgba(102, 126, 234, 0.6)',
                    labelColor: this.style.labelColor
                });
            }
        }

        // 绘制边长
        if (options.showSides) {
            const sides = this.getSides();
            for (let i = 0; i < 3; i++) {
                const p1 = this.points[i];
                const p2 = this.points[(i + 1) % 3];
                renderer.drawSideLength(p1, p2, sides[i], {
                    color: this.style.strokeColor
                });
            }
        }

        // 绘制顶点
        const labels = ['A', 'B', 'C'];
        for (let i = 0; i < 3; i++) {
            renderer.drawPoint(this.points[i], {
                radius: this.style.pointRadius,
                color: this.style.pointColor,
                label: labels[i],
                isSelected: this.selected
            });
        }

        // 绘制旋转控制点（可选）
        if (options.showRotateHandle) {
            const center = this.getCenter();
            renderer.drawRotateHandle(center, {
                isHovered: options.hoveredCenter,
                isActive: options.isRotating
            });
        }
    }

    static fromJSON(data) {
        const points = data.points.map(p => new Point(p.x, p.y));
        const triangle = new Triangle(points, data.triangleType || 'any', {
            style: data.style,
            info: data.info
        });
        triangle.id = data.id;
        return triangle;
    }
}

// ============================================================================
// Quadrilateral - 四边形
// ============================================================================
export class Quadrilateral extends Shape {
    constructor(points, quadType = 'any', options = {}) {
        super('quadrilateral', options);

        if (points && points.length === 4) {
            this.points = points.map(p => p instanceof Point ? p : new Point(p.x, p.y));
        } else {
            // 默认创建
            this.points = this._createDefaultPoints(quadType, 250, 200, 100);
        }

        this.quadType = quadType;

        const names = {
            any: '任意四边形',
            parallelogram: '平行四边形',
            rectangle: '矩形',
            square: '正方形',
            rhombus: '菱形',
            trapezoid: '梯形',
            kite: '筝形'
        };

        this.info = {
            name: names[quadType] || '四边形',
            description: this._getDescription(quadType),
            ...options.info
        };
    }

    _createDefaultPoints(type, cx, cy, size) {
        switch (type) {
            case 'square':
                return [
                    new Point(cx + size, cy - size),
                    new Point(cx + size, cy + size),
                    new Point(cx - size, cy + size),
                    new Point(cx - size, cy - size)
                ];
            case 'rectangle':
                return [
                    new Point(cx + size, cy - size * 0.7),
                    new Point(cx + size, cy + size * 0.7),
                    new Point(cx - size, cy + size * 0.7),
                    new Point(cx - size, cy - size * 0.7)
                ];
            case 'rhombus':
                return [
                    new Point(cx, cy - size),
                    new Point(cx + size * 1.3, cy),
                    new Point(cx, cy + size),
                    new Point(cx - size * 1.3, cy)
                ];
            case 'parallelogram':
                return [
                    new Point(cx + 50, cy - 80),
                    new Point(cx + 130, cy + 60),
                    new Point(cx - 50, cy + 80),
                    new Point(cx - 130, cy - 60)
                ];
            case 'trapezoid':
                return [
                    new Point(cx + 60, cy - 80),
                    new Point(cx + 140, cy + 80),
                    new Point(cx - 140, cy + 80),
                    new Point(cx - 60, cy - 80)
                ];
            case 'kite':
                return [
                    new Point(cx, cy - 120),
                    new Point(cx + 80, cy),
                    new Point(cx, cy + 100),
                    new Point(cx - 80, cy)
                ];
            default:
                return [
                    new Point(cx + 70, cy - 100),
                    new Point(cx + 120, cy + 70),
                    new Point(cx - 20, cy + 120),
                    new Point(cx - 100, cy - 30)
                ];
        }
    }

    _getDescription(type) {
        const descriptions = {
            any: '四边形是由四条边、四个顶点和四个角组成的多边形。内角和始终为360°。',
            parallelogram: '两组对边分别平行的四边形。对边相等，对角相等，对角线互相平分。',
            rectangle: '四个角都是直角的平行四边形。对边相等，对角线相等且互相平分。',
            square: '四条边相等且四个角都是直角的四边形。是特殊的矩形和菱形。',
            rhombus: '四条边都相等的平行四边形。对角线互相垂直平分，对角相等。',
            trapezoid: '只有一组对边平行的四边形。平行的两边称为上底和下底。',
            kite: '有两组邻边分别相等的四边形。对角线互相垂直，其中一条对角线平分另一条。'
        };
        return descriptions[type] || descriptions.any;
    }

    getPerimeter() {
        return GeometryUtils.polygonPerimeter(this.points);
    }

    getArea() {
        return GeometryUtils.polygonArea(this.points);
    }

    getAngles() {
        const angles = [];
        for (let i = 0; i < 4; i++) {
            const prev = this.points[(i + 3) % 4];
            const curr = this.points[i];
            const next = this.points[(i + 1) % 4];
            const angle = GeometryUtils.angleFromThreePoints(prev, curr, next);
            angles.push(GeometryUtils.radToDeg(angle));
        }
        return angles;
    }

    getSides() {
        const sides = [];
        for (let i = 0; i < 4; i++) {
            sides.push(this.points[i].distanceTo(this.points[(i + 1) % 4]));
        }
        return sides;
    }

    getDiagonals() {
        return [
            this.points[0].distanceTo(this.points[2]),
            this.points[1].distanceTo(this.points[3])
        ];
    }

    applyConstraints(draggedIndex) {
        if (this.quadType === 'any') return;

        const idx = draggedIndex;

        switch (this.quadType) {
            case 'parallelogram':
                this._applyParallelogramConstraint(idx);
                break;
            case 'rectangle':
                this._applyRectangleConstraint(idx);
                break;
            case 'square':
                this._applySquareConstraint(idx);
                break;
            case 'rhombus':
                this._applyRhombusConstraint(idx);
                break;
            case 'trapezoid':
                this._applyTrapezoidConstraint(idx);
                break;
            case 'kite':
                this._applyKiteConstraint(idx);
                break;
        }
    }

    _applyParallelogramConstraint(idx) {
        const opposite = (idx + 2) % 4;
        const prev = (idx + 3) % 4;
        const next = (idx + 1) % 4;

        const center = Point.midpoint(this.points[idx], this.points[opposite]);
        this.points[prev].x = 2 * center.x - this.points[next].x;
        this.points[prev].y = 2 * center.y - this.points[next].y;
    }

    _applyRectangleConstraint(idx) {
        const opposite = (idx + 2) % 4;
        const prev = (idx + 3) % 4;
        const next = (idx + 1) % 4;

        const center = Point.midpoint(this.points[idx], this.points[opposite]);
        const dx = this.points[idx].x - center.x;
        const dy = this.points[idx].y - center.y;

        this.points[opposite].x = center.x - dx;
        this.points[opposite].y = center.y - dy;
        this.points[next].x = center.x - dy;
        this.points[next].y = center.y + dx;
        this.points[prev].x = center.x + dy;
        this.points[prev].y = center.y - dx;
    }

    _applySquareConstraint(idx) {
        const opposite = (idx + 2) % 4;
        const prev = (idx + 3) % 4;
        const next = (idx + 1) % 4;

        const center = Point.midpoint(this.points[idx], this.points[opposite]);
        const dx = this.points[idx].x - center.x;
        const dy = this.points[idx].y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const ndx = dx / dist;
        const ndy = dy / dist;

        this.points[opposite].x = center.x - ndx * dist;
        this.points[opposite].y = center.y - ndy * dist;
        this.points[next].x = center.x - ndy * dist;
        this.points[next].y = center.y + ndx * dist;
        this.points[prev].x = center.x + ndy * dist;
        this.points[prev].y = center.y - ndx * dist;
    }

    _applyRhombusConstraint(idx) {
        const opposite = (idx + 2) % 4;
        const prev = (idx + 3) % 4;
        const next = (idx + 1) % 4;

        const center = Point.midpoint(this.points[idx], this.points[opposite]);
        const dx = this.points[idx].x - center.x;
        const dy = this.points[idx].y - center.y;

        this.points[opposite].x = center.x - dx;
        this.points[opposite].y = center.y - dy;

        const otherDist = this.points[next].distanceTo(center);
        const perpDx = -dy;
        const perpDy = dx;
        const perpLen = Math.sqrt(perpDx * perpDx + perpDy * perpDy);

        if (perpLen > 0) {
            this.points[next].x = center.x + (perpDx / perpLen) * otherDist;
            this.points[next].y = center.y + (perpDy / perpLen) * otherDist;
            this.points[prev].x = center.x - (perpDx / perpLen) * otherDist;
            this.points[prev].y = center.y - (perpDy / perpLen) * otherDist;
        }
    }

    _applyTrapezoidConstraint(idx) {
        if (idx >= 2) {
            const dcVector = {
                x: this.points[2].x - this.points[3].x,
                y: this.points[2].y - this.points[3].y
            };
            const dcLen = Math.sqrt(dcVector.x * dcVector.x + dcVector.y * dcVector.y);

            if (dcLen > 0) {
                const abLen = this.points[0].distanceTo(this.points[1]);
                const unitDC = { x: dcVector.x / dcLen, y: dcVector.y / dcLen };
                const abMid = Point.midpoint(this.points[0], this.points[1]);

                this.points[0].x = abMid.x - unitDC.x * abLen / 2;
                this.points[0].y = abMid.y - unitDC.y * abLen / 2;
                this.points[1].x = abMid.x + unitDC.x * abLen / 2;
                this.points[1].y = abMid.y + unitDC.y * abLen / 2;
            }
        }
    }

    _applyKiteConstraint(idx) {
        if (idx === 0) {
            const distAB = this.points[0].distanceTo(this.points[1]);
            const distAD = this.points[0].distanceTo(this.points[3]);
            const avgDist = (distAB + distAD) / 2;

            for (const i of [1, 3]) {
                const dir = Vector.fromPoints(this.points[0], this.points[i]).normalize();
                this.points[i].x = this.points[0].x + dir.x * avgDist;
                this.points[i].y = this.points[0].y + dir.y * avgDist;
            }
        } else if (idx === 2) {
            const distCB = this.points[2].distanceTo(this.points[1]);
            const distCD = this.points[2].distanceTo(this.points[3]);
            const avgDist = (distCB + distCD) / 2;

            for (const i of [1, 3]) {
                const dir = Vector.fromPoints(this.points[2], this.points[i]).normalize();
                this.points[i].x = this.points[2].x + dir.x * avgDist;
                this.points[i].y = this.points[2].y + dir.y * avgDist;
            }
        } else {
            const other = idx === 1 ? 3 : 1;
            const acMid = Point.midpoint(this.points[0], this.points[2]);
            const acDir = Vector.fromPoints(this.points[0], this.points[2]);
            const acLen = acDir.length;

            if (acLen > 0) {
                const perpDir = { x: -acDir.y / acLen, y: acDir.x / acLen };
                const toPoint = {
                    x: this.points[idx].x - acMid.x,
                    y: this.points[idx].y - acMid.y
                };
                const projOnPerp = toPoint.x * perpDir.x + toPoint.y * perpDir.y;

                this.points[other].x = this.points[idx].x - 2 * projOnPerp * perpDir.x;
                this.points[other].y = this.points[idx].y - 2 * projOnPerp * perpDir.y;
            }
        }
    }

    contains(point) {
        return GeometryUtils.pointInPolygon(point, this.points);
    }

    draw(ctx, options = {}) {
        const renderer = new Renderer2D(ctx);

        // 绘制填充和边框
        renderer.drawPolygon(this.points, {
            fillColor: this.style.fillColor,
            strokeColor: this.style.strokeColor,
            lineWidth: this.style.lineWidth
        });

        // 绘制对角线
        if (options.showDiagonals) {
            renderer.drawLine(this.points[0], this.points[2], {
                color: this.style.diagonalColor || 'rgba(102, 126, 234, 0.5)',
                lineWidth: 2,
                dashed: true
            });
            renderer.drawLine(this.points[1], this.points[3], {
                color: this.style.diagonalColor || 'rgba(102, 126, 234, 0.5)',
                lineWidth: 2,
                dashed: true
            });

            // 显示对角线长度
            const diags = this.getDiagonals();
            const mid1 = Point.midpoint(this.points[0], this.points[2]);
            const mid2 = Point.midpoint(this.points[1], this.points[3]);

            renderer.drawText(diags[0].toFixed(0), new Point(mid1.x + 5, mid1.y - 5), {
                color: this.style.diagonalColor || 'rgba(102, 126, 234, 0.5)'
            });
            renderer.drawText(diags[1].toFixed(0), new Point(mid2.x + 5, mid2.y + 15), {
                color: this.style.diagonalColor || 'rgba(102, 126, 234, 0.5)'
            });
        }

        // 绘制角度
        if (options.showAngles) {
            const angles = this.getAngles();
            for (let i = 0; i < 4; i++) {
                const prev = this.points[(i + 3) % 4];
                const curr = this.points[i];
                const next = this.points[(i + 1) % 4];

                renderer.drawAngle(curr, prev, next, angles[i], {
                    fillColor: this.style.angleColor || 'rgba(102, 126, 234, 0.6)',
                    labelColor: this.style.labelColor
                });
            }
        }

        // 绘制边长
        if (options.showSides) {
            const sides = this.getSides();
            for (let i = 0; i < 4; i++) {
                const p1 = this.points[i];
                const p2 = this.points[(i + 1) % 4];
                renderer.drawSideLength(p1, p2, sides[i], {
                    color: this.style.strokeColor
                });
            }
        }

        // 绘制顶点
        const labels = ['A', 'B', 'C', 'D'];
        for (let i = 0; i < 4; i++) {
            renderer.drawPoint(this.points[i], {
                radius: this.style.pointRadius,
                color: this.style.pointColor,
                label: labels[i],
                isSelected: this.selected
            });
        }

        // 绘制旋转控制点（可选）
        if (options.showRotateHandle) {
            const center = this.getCenter();
            renderer.drawRotateHandle(center, {
                isHovered: options.hoveredCenter,
                isActive: options.isRotating
            });
        }
    }

    static fromJSON(data) {
        const points = data.points.map(p => new Point(p.x, p.y));
        const quad = new Quadrilateral(points, data.quadType || 'any', {
            style: data.style,
            info: data.info
        });
        quad.id = data.id;
        return quad;
    }
}

// ============================================================================
// Circle - 圆/扇形/弧
// ============================================================================
export class Circle extends Shape {
    constructor(center, radius, circleType = 'circle', options = {}) {
        super('circle', options);

        this.center = center instanceof Point ? center : new Point(center.x, center.y);
        this.radius = radius;
        this.circleType = circleType; // 'circle', 'sector', 'arc'
        this.startAngle = options.startAngle || 0;
        this.endAngle = options.endAngle || Math.PI * 2;

        // 为了支持拖拽，创建控制点
        this.points = [
            this.center,
            new Point(this.center.x + radius, this.center.y) // 半径控制点
        ];

        const names = {
            circle: '圆',
            sector: '扇形',
            arc: '弧'
        };

        this.info = {
            name: names[circleType] || '圆',
            description: this._getDescription(circleType),
            ...options.info
        };
    }

    _getDescription(type) {
        const descriptions = {
            circle: '圆是平面上到定点（圆心）距离等于定长（半径）的所有点组成的图形。',
            sector: '扇形是由两条半径和一段弧围成的图形。',
            arc: '弧是圆上任意两点之间的部分。'
        };
        return descriptions[type] || descriptions.circle;
    }

    getRadius() {
        return this.center.distanceTo(this.points[1]);
    }

    getPerimeter() {
        const r = this.getRadius();
        if (this.circleType === 'circle') {
            return 2 * Math.PI * r;
        } else {
            const arcAngle = Math.abs(this.endAngle - this.startAngle);
            const arcLength = r * arcAngle;
            if (this.circleType === 'sector') {
                return arcLength + 2 * r;
            }
            return arcLength;
        }
    }

    getArea() {
        const r = this.getRadius();
        if (this.circleType === 'circle') {
            return Math.PI * r * r;
        } else if (this.circleType === 'sector') {
            const arcAngle = Math.abs(this.endAngle - this.startAngle);
            return (arcAngle / (2 * Math.PI)) * Math.PI * r * r;
        }
        return 0;
    }

    getCenter() {
        return this.points[0];
    }

    applyConstraints(draggedIndex) {
        if (draggedIndex === 1) {
            // 拖动半径控制点时，保持在圆上
            // 已经在拖拽时更新了位置，这里不需要额外约束
        }
    }

    contains(point) {
        return point.distanceTo(this.center) <= this.getRadius();
    }

    draw(ctx, options = {}) {
        const renderer = new Renderer2D(ctx);
        const center = this.points[0];
        const radius = this.getRadius();

        if (this.circleType === 'circle') {
            // 绘制圆
            renderer.drawCircle(center, radius, {
                fillColor: this.style.fillColor,
                strokeColor: this.style.strokeColor,
                lineWidth: this.style.lineWidth
            });
        } else {
            // 绘制扇形或弧
            renderer.drawArc(center, radius, this.startAngle, this.endAngle, {
                fillColor: this.circleType === 'sector' ? this.style.fillColor : null,
                strokeColor: this.style.strokeColor,
                lineWidth: this.style.lineWidth,
                sector: this.circleType === 'sector'
            });
        }

        // 绘制中心点
        renderer.drawPoint(center, {
            radius: this.style.pointRadius,
            color: this.style.pointColor,
            label: 'O',
            isSelected: this.selected
        });

        // 绘制半径控制点
        renderer.drawPoint(this.points[1], {
            radius: this.style.pointRadius * 0.8,
            color: this.style.pointColor,
            label: ''
        });

        // 绘制半径线
        if (options.showSides) {
            renderer.drawLine(center, this.points[1], {
                color: this.style.strokeColor,
                lineWidth: 1,
                dashed: true
            });

            renderer.drawSideLength(center, this.points[1], radius, {
                color: this.style.strokeColor
            });
        }

        // 绘制旋转控制点（可选）
        if (options.showRotateHandle) {
            renderer.drawRotateHandle(center, {
                isHovered: options.hoveredCenter,
                isActive: options.isRotating
            });
        }
    }

    static fromJSON(data) {
        const circle = new Circle(
            new Point(data.center.x, data.center.y),
            data.radius,
            data.circleType || 'circle',
            {
                style: data.style,
                info: data.info,
                startAngle: data.startAngle,
                endAngle: data.endAngle
            }
        );
        circle.id = data.id;
        return circle;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            center: this.center.toJSON(),
            radius: this.radius,
            circleType: this.circleType,
            startAngle: this.startAngle,
            endAngle: this.endAngle
        };
    }
}

// ============================================================================
// Polygon - 正多边形/任意多边形
// ============================================================================
export class Polygon extends Shape {
    constructor(points, sides = 5, options = {}) {
        super('polygon', options);

        if (Array.isArray(points) && points.length >= 3) {
            this.points = points.map(p => p instanceof Point ? p : new Point(p.x, p.y));
            this.sides = points.length;
            this.isRegular = options.isRegular || false;
        } else {
            // 创建正多边形
            const center = points instanceof Point ? points : new Point(250, 200);
            const radius = options.radius || 100;
            this.points = GeometryUtils.regularPolygonPoints(center, radius, sides);
            this.sides = sides;
            this.isRegular = true;
        }

        const names = {
            3: '三角形',
            4: '四边形',
            5: '五边形',
            6: '六边形',
            7: '七边形',
            8: '八边形'
        };

        this.info = {
            name: this.isRegular ? `正${names[this.sides] || this.sides + '边形'}` : (names[this.sides] || this.sides + '边形'),
            description: `${this.sides}边形是由${this.sides}条边组成的多边形。内角和为${(this.sides - 2) * 180}°。`,
            ...options.info
        };
    }

    getPerimeter() {
        return GeometryUtils.polygonPerimeter(this.points);
    }

    getArea() {
        return GeometryUtils.polygonArea(this.points);
    }

    getAngles() {
        const angles = [];
        const n = this.points.length;
        for (let i = 0; i < n; i++) {
            const prev = this.points[(i + n - 1) % n];
            const curr = this.points[i];
            const next = this.points[(i + 1) % n];
            const angle = GeometryUtils.angleFromThreePoints(prev, curr, next);
            angles.push(GeometryUtils.radToDeg(angle));
        }
        return angles;
    }

    getSides() {
        const sides = [];
        const n = this.points.length;
        for (let i = 0; i < n; i++) {
            sides.push(this.points[i].distanceTo(this.points[(i + 1) % n]));
        }
        return sides;
    }

    applyConstraints(draggedIndex) {
        if (!this.isRegular) return;

        // 正多边形：保持所有边相等
        const center = this.getCenter();
        const dist = this.points[draggedIndex].distanceTo(center);

        const angleOffset = Math.atan2(
            this.points[draggedIndex].y - center.y,
            this.points[draggedIndex].x - center.x
        ) - (2 * Math.PI * draggedIndex) / this.sides;

        for (let i = 0; i < this.sides; i++) {
            const angle = angleOffset + (2 * Math.PI * i) / this.sides;
            this.points[i].x = center.x + dist * Math.cos(angle);
            this.points[i].y = center.y + dist * Math.sin(angle);
        }
    }

    contains(point) {
        return GeometryUtils.pointInPolygon(point, this.points);
    }

    draw(ctx, options = {}) {
        const renderer = new Renderer2D(ctx);
        const n = this.points.length;

        // 绘制填充和边框
        renderer.drawPolygon(this.points, {
            fillColor: this.style.fillColor,
            strokeColor: this.style.strokeColor,
            lineWidth: this.style.lineWidth
        });

        // 绘制角度
        if (options.showAngles) {
            const angles = this.getAngles();
            for (let i = 0; i < n; i++) {
                const prev = this.points[(i + n - 1) % n];
                const curr = this.points[i];
                const next = this.points[(i + 1) % n];

                renderer.drawAngle(curr, prev, next, angles[i], {
                    fillColor: this.style.angleColor || 'rgba(102, 126, 234, 0.6)',
                    labelColor: this.style.labelColor,
                    radius: 20
                });
            }
        }

        // 绘制边长
        if (options.showSides) {
            const sides = this.getSides();
            for (let i = 0; i < n; i++) {
                const p1 = this.points[i];
                const p2 = this.points[(i + 1) % n];
                renderer.drawSideLength(p1, p2, sides[i], {
                    color: this.style.strokeColor
                });
            }
        }

        // 绘制顶点
        const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        for (let i = 0; i < n; i++) {
            renderer.drawPoint(this.points[i], {
                radius: this.style.pointRadius,
                color: this.style.pointColor,
                label: labels[i % 26],
                isSelected: this.selected
            });
        }

        // 绘制旋转控制点（可选）
        if (options.showRotateHandle) {
            const center = this.getCenter();
            renderer.drawRotateHandle(center, {
                isHovered: options.hoveredCenter,
                isActive: options.isRotating
            });
        }
    }

    static fromJSON(data) {
        const points = data.points.map(p => new Point(p.x, p.y));
        const polygon = new Polygon(points, data.sides, {
            style: data.style,
            info: data.info,
            isRegular: data.isRegular
        });
        polygon.id = data.id;
        return polygon;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            sides: this.sides,
            isRegular: this.isRegular
        };
    }
}

// ============================================================================
// 形状工厂函数
// ============================================================================
export function createShape2D(type, options = {}) {
    switch (type) {
        case 'point':
            return new Point2D(options.x || 250, options.y || 200, options);

        case 'line':
        case 'segment':
            return new Line2D(
                new Point(options.x1 || 150, options.y1 || 200),
                new Point(options.x2 || 350, options.y2 || 200),
                'segment',
                options
            );

        case 'ray':
            return new Line2D(
                new Point(options.x1 || 150, options.y1 || 200),
                new Point(options.x2 || 350, options.y2 || 200),
                'ray',
                options
            );

        case 'straightLine':
            return new Line2D(
                new Point(options.x1 || 150, options.y1 || 200),
                new Point(options.x2 || 350, options.y2 || 200),
                'line',
                options
            );

        case 'triangle':
        case 'triangle-any':
            return new Triangle(null, 'any', options);

        case 'triangle-isosceles':
            return new Triangle(null, 'isosceles', options);

        case 'triangle-equilateral':
            return new Triangle(null, 'equilateral', options);

        case 'triangle-right':
            return new Triangle(null, 'right', options);

        case 'quadrilateral':
        case 'quadrilateral-any':
            return new Quadrilateral(null, 'any', options);

        case 'parallelogram':
            return new Quadrilateral(null, 'parallelogram', options);

        case 'rectangle':
            return new Quadrilateral(null, 'rectangle', options);

        case 'square':
            return new Quadrilateral(null, 'square', options);

        case 'rhombus':
            return new Quadrilateral(null, 'rhombus', options);

        case 'trapezoid':
            return new Quadrilateral(null, 'trapezoid', options);

        case 'kite':
            return new Quadrilateral(null, 'kite', options);

        case 'circle':
            return new Circle(
                new Point(options.cx || 250, options.cy || 200),
                options.radius || 80,
                'circle',
                options
            );

        case 'sector':
            return new Circle(
                new Point(options.cx || 250, options.cy || 200),
                options.radius || 80,
                'sector',
                { ...options, startAngle: options.startAngle || 0, endAngle: options.endAngle || Math.PI / 2 }
            );

        case 'arc':
            return new Circle(
                new Point(options.cx || 250, options.cy || 200),
                options.radius || 80,
                'arc',
                { ...options, startAngle: options.startAngle || 0, endAngle: options.endAngle || Math.PI }
            );

        case 'pentagon':
            return new Polygon(new Point(250, 200), 5, { ...options, isRegular: true });

        case 'hexagon':
            return new Polygon(new Point(250, 200), 6, { ...options, isRegular: true });

        default:
            // 任意多边形
            if (type.startsWith('polygon-')) {
                const sides = parseInt(type.split('-')[1]) || 5;
                return new Polygon(new Point(250, 200), sides, { ...options, isRegular: true });
            }
            return null;
    }
}

// 从 JSON 恢复形状
export function shapeFromJSON(data) {
    switch (data.type) {
        case 'point':
            return Point2D.fromJSON(data);
        case 'line':
            return Line2D.fromJSON(data);
        case 'triangle':
            return Triangle.fromJSON(data);
        case 'quadrilateral':
            return Quadrilateral.fromJSON(data);
        case 'circle':
            return Circle.fromJSON(data);
        case 'polygon':
            return Polygon.fromJSON(data);
        default:
            return null;
    }
}
