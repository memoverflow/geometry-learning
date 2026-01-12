/**
 * 辅助线模块
 * 几何辅助线系统，用于数学解题
 */

import { Point, Vector } from './geometry-engine.js';
import { Renderer2D } from './renderer.js';

// ============================================================================
// AuxiliaryLine 辅助线类
// ============================================================================
export class AuxiliaryLine {
    constructor(type, shape, params = {}) {
        this.id = `aux_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.type = type;
        this.shape = shape;
        this.params = params;
        this.visible = true;

        this.style = {
            color: '#f59e0b',
            lineWidth: 1.5,
            dashPattern: [8, 4],
            pointRadius: 4,
            ...params.style
        };
    }

    // 计算辅助线的端点（动态计算，跟随形状变换）
    getEndpoints() {
        if (!this.shape?.points) return null;

        const handlers = {
            'connecting': () => this._getConnectingEndpoints(),
            'median': () => this._getMedianEndpoints(),
            'altitude': () => this._getAltitudeEndpoints(),
            'perpendicular-bisector': () => this._getPerpendicularBisectorEndpoints(),
            'angle-bisector': () => this._getAngleBisectorEndpoints(),
            'parallel': () => this._getParallelEndpoints(),
            'perpendicular': () => this._getPerpendicularEndpoints(),
            'midline': () => this._getMidlineEndpoints(),
            'extension': () => this._getExtensionEndpoints()
        };

        return handlers[this.type]?.() || null;
    }

    // 连接线：连接两个顶点
    _getConnectingEndpoints() {
        const { vertexIndex1, vertexIndex2 } = this.params;
        const points = this.shape.points;
        if (vertexIndex1 >= points.length || vertexIndex2 >= points.length) return null;

        return {
            start: points[vertexIndex1],
            end: points[vertexIndex2],
            type: 'segment'
        };
    }

    // 中线：顶点到对边中点
    _getMedianEndpoints() {
        const { vertexIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (vertexIndex >= n || n < 3) return null;

        // 对边的两个顶点
        const i1 = (vertexIndex + 1) % n;
        const i2 = (vertexIndex + 2) % n;
        const midpoint = Point.midpoint(points[i1], points[i2]);

        return {
            start: points[vertexIndex],
            end: midpoint,
            midpoint,
            type: 'segment'
        };
    }

    // 高线：顶点到对边的垂线
    _getAltitudeEndpoints() {
        const { vertexIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (vertexIndex >= n || n < 3) return null;

        const vertex = points[vertexIndex];
        const edgeStart = points[(vertexIndex + 1) % n];
        const edgeEnd = points[(vertexIndex + 2) % n];
        const foot = this._perpendicularFoot(vertex, edgeStart, edgeEnd);

        return {
            start: vertex,
            end: foot,
            foot,
            edgeStart,
            edgeEnd,
            isRightAngle: true,
            type: 'segment'
        };
    }

    // 垂直平分线
    _getPerpendicularBisectorEndpoints() {
        const { edgeIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (edgeIndex >= n) return null;

        const p1 = points[edgeIndex];
        const p2 = points[(edgeIndex + 1) % n];
        const midpoint = Point.midpoint(p1, p2);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;

        const perpX = -dy / len;
        const perpY = dx / len;
        const extendLength = 300;

        return {
            start: new Point(midpoint.x - perpX * extendLength, midpoint.y - perpY * extendLength),
            end: new Point(midpoint.x + perpX * extendLength, midpoint.y + perpY * extendLength),
            midpoint,
            isRightAngle: true,
            type: 'line'
        };
    }

    // 角平分线
    _getAngleBisectorEndpoints() {
        const { vertexIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (vertexIndex >= n || n < 3) return null;

        const vertex = points[vertexIndex];
        const prev = points[(vertexIndex + n - 1) % n];
        const next = points[(vertexIndex + 1) % n];

        const v1 = Vector.fromPoints(vertex, prev).normalize();
        const v2 = Vector.fromPoints(vertex, next).normalize();
        const bisectorDir = new Vector(v1.x + v2.x, v1.y + v2.y).normalize();

        const extendLength = 500;
        const bisectorEnd = new Point(
            vertex.x + bisectorDir.x * extendLength,
            vertex.y + bisectorDir.y * extendLength
        );

        // 找与对边的交点
        let intersection = null;
        for (let i = 0; i < n; i++) {
            if (i === vertexIndex || i === (vertexIndex + n - 1) % n) continue;
            const inter = this._lineIntersection(
                vertex, bisectorEnd,
                points[i], points[(i + 1) % n]
            );
            if (inter && this._isPointOnSegment(inter, points[i], points[(i + 1) % n])) {
                intersection = inter;
                break;
            }
        }

        return {
            start: vertex,
            end: intersection || bisectorEnd,
            type: 'ray'
        };
    }

    // 平行线
    _getParallelEndpoints() {
        const { throughVertexIndex, parallelToEdgeIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (throughVertexIndex >= n || parallelToEdgeIndex >= n) return null;

        const throughPoint = points[throughVertexIndex];
        const edgeStart = points[parallelToEdgeIndex];
        const edgeEnd = points[(parallelToEdgeIndex + 1) % n];

        const dx = edgeEnd.x - edgeStart.x;
        const dy = edgeEnd.y - edgeStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;

        const dirX = dx / len;
        const dirY = dy / len;
        const extendLength = 300;

        return {
            start: new Point(throughPoint.x - dirX * extendLength, throughPoint.y - dirY * extendLength),
            end: new Point(throughPoint.x + dirX * extendLength, throughPoint.y + dirY * extendLength),
            throughPoint,
            type: 'line'
        };
    }

    // 垂线
    _getPerpendicularEndpoints() {
        const { throughVertexIndex, perpendicularToEdgeIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (throughVertexIndex >= n || perpendicularToEdgeIndex >= n) return null;

        const throughPoint = points[throughVertexIndex];
        const edgeStart = points[perpendicularToEdgeIndex];
        const edgeEnd = points[(perpendicularToEdgeIndex + 1) % n];
        const foot = this._perpendicularFoot(throughPoint, edgeStart, edgeEnd);

        return {
            start: throughPoint,
            end: foot,
            foot,
            isRightAngle: true,
            type: 'segment'
        };
    }

    // 中位线
    _getMidlineEndpoints() {
        const { edgeIndex1, edgeIndex2 } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (edgeIndex1 >= n || edgeIndex2 >= n) return null;

        const mid1 = Point.midpoint(points[edgeIndex1], points[(edgeIndex1 + 1) % n]);
        const mid2 = Point.midpoint(points[edgeIndex2], points[(edgeIndex2 + 1) % n]);

        return {
            start: mid1,
            end: mid2,
            midpoint1: mid1,
            midpoint2: mid2,
            type: 'segment'
        };
    }

    // 延长线
    _getExtensionEndpoints() {
        const { edgeIndex, direction = 'both', extendLength = 150 } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (edgeIndex >= n) return null;

        const p1 = points[edgeIndex];
        const p2 = points[(edgeIndex + 1) % n];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;

        const dirX = dx / len;
        const dirY = dy / len;

        let start, end;
        if (direction === 'both') {
            start = new Point(p1.x - dirX * extendLength, p1.y - dirY * extendLength);
            end = new Point(p2.x + dirX * extendLength, p2.y + dirY * extendLength);
        } else if (direction === 'start') {
            start = new Point(p1.x - dirX * extendLength, p1.y - dirY * extendLength);
            end = p1;
        } else {
            start = p2;
            end = new Point(p2.x + dirX * extendLength, p2.y + dirY * extendLength);
        }

        return { start, end, type: 'ray' };
    }

    // 辅助计算：垂足
    _perpendicularFoot(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return lineStart.clone();

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / len2;
        return new Point(lineStart.x + t * dx, lineStart.y + t * dy);
    }

    // 辅助计算：两线段交点
    _lineIntersection(p1, p2, p3, p4) {
        const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
        const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
        const cross = d1x * d2y - d1y * d2x;
        if (Math.abs(cross) < 0.0001) return null;

        const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
        return new Point(p1.x + t * d1x, p1.y + t * d1y);
    }

    // 辅助计算：点是否在线段上
    _isPointOnSegment(point, segStart, segEnd) {
        const margin = 0.1;
        return point.x >= Math.min(segStart.x, segEnd.x) - margin &&
               point.x <= Math.max(segStart.x, segEnd.x) + margin &&
               point.y >= Math.min(segStart.y, segEnd.y) - margin &&
               point.y <= Math.max(segStart.y, segEnd.y) + margin;
    }

    // 绘制
    draw(ctx) {
        if (!this.visible) return;

        const endpoints = this.getEndpoints();
        if (!endpoints) return;

        const renderer = new Renderer2D(ctx);
        const { start, end } = endpoints;

        // 绘制虚线
        renderer.drawLine(start, end, {
            color: this.style.color,
            lineWidth: this.style.lineWidth,
            dashed: true,
            dashPattern: this.style.dashPattern
        });

        // 根据辅助线类型绘制特殊标记
        switch (this.type) {
            case 'median':
                // 中线：标记中点
                this._drawEndpoint(renderer, start);
                this._drawMidpointMark(ctx, endpoints.midpoint);
                break;

            case 'altitude':
                // 高线：标记直角
                this._drawEndpoint(renderer, start);
                this._drawEndpoint(renderer, endpoints.foot);
                this._drawRightAngleMark(ctx, endpoints.foot, start, endpoints.edgeEnd);
                break;

            case 'perpendicular-bisector':
                // 垂直平分线：标记中点和直角
                this._drawMidpointMark(ctx, endpoints.midpoint);
                this._drawPerpendicularMark(ctx, endpoints.midpoint, start, end);
                break;

            case 'angle-bisector':
                // 角平分线：标记等角弧
                this._drawEndpoint(renderer, start);
                this._drawAngleBisectorMarks(ctx, start);
                break;

            case 'parallel':
                // 平行线：标记平行符号
                this._drawParallelMarks(ctx, start, end, endpoints.throughPoint);
                break;

            case 'perpendicular':
                // 垂线：标记直角
                this._drawEndpoint(renderer, start);
                this._drawEndpoint(renderer, endpoints.foot);
                this._drawRightAngleMark(ctx, endpoints.foot, start, this._getPerpendicularEdgeDir());
                break;

            case 'midline':
                // 中位线：标记两个中点
                this._drawMidpointMark(ctx, endpoints.midpoint1);
                this._drawMidpointMark(ctx, endpoints.midpoint2);
                break;

            case 'extension':
                // 延长线：无特殊标记，只绘制虚线
                break;

            case 'connecting':
            default:
                // 连接线：绘制端点
                this._drawEndpoint(renderer, start);
                this._drawEndpoint(renderer, end);
                break;
        }
    }

    // 获取垂线的边方向（用于绘制直角标记）
    _getPerpendicularEdgeDir() {
        const { perpendicularToEdgeIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        const edgeEnd = points[(perpendicularToEdgeIndex + 1) % n];
        return edgeEnd;
    }

    _drawEndpoint(renderer, point) {
        if (!point) return;
        renderer.drawPoint(point, {
            radius: this.style.pointRadius,
            color: this.style.color,
            label: ''
        });
    }

    // 绘制中点标记（小圆点）
    _drawMidpointMark(ctx, midpoint) {
        if (!midpoint) return;

        ctx.save();
        ctx.fillStyle = this.style.color;

        // 绘制小圆点
        ctx.beginPath();
        ctx.arc(midpoint.x, midpoint.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 绘制直角标记
    _drawRightAngleMark(ctx, vertex, p1, p2) {
        if (!vertex || !p1 || !p2) return;

        const size = 12;

        const dx1 = p1.x - vertex.x, dy1 = p1.y - vertex.y;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        if (len1 === 0) return;

        const dx2 = p2.x - vertex.x, dy2 = p2.y - vertex.y;
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (len2 === 0) return;

        const ux1 = dx1 / len1 * size, uy1 = dy1 / len1 * size;
        const ux2 = dx2 / len2 * size, uy2 = dy2 / len2 * size;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(vertex.x + ux1, vertex.y + uy1);
        ctx.lineTo(vertex.x + ux1 + ux2, vertex.y + uy1 + uy2);
        ctx.lineTo(vertex.x + ux2, vertex.y + uy2);
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 在直角内填充小方块
        ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.beginPath();
        ctx.moveTo(vertex.x, vertex.y);
        ctx.lineTo(vertex.x + ux1, vertex.y + uy1);
        ctx.lineTo(vertex.x + ux1 + ux2, vertex.y + uy1 + uy2);
        ctx.lineTo(vertex.x + ux2, vertex.y + uy2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // 绘制垂直平分线的垂直标记
    _drawPerpendicularMark(ctx, midpoint, lineStart, lineEnd) {
        if (!midpoint) return;

        // 计算垂直平分线的方向
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;

        // 原边的方向（垂直于垂直平分线）
        const perpDx = -dy / len;
        const perpDy = dx / len;

        const size = 10;
        ctx.save();
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = 2;

        // 绘制垂直符号（两条小线段）
        ctx.beginPath();
        // 第一条
        ctx.moveTo(midpoint.x + perpDx * size, midpoint.y + perpDy * size);
        ctx.lineTo(midpoint.x + perpDx * size + dx / len * size, midpoint.y + perpDy * size + dy / len * size);
        ctx.lineTo(midpoint.x + dx / len * size, midpoint.y + dy / len * size);
        ctx.stroke();
        ctx.restore();
    }

    // 绘制角平分线的等角标记
    _drawAngleBisectorMarks(ctx, vertex) {
        const { vertexIndex } = this.params;
        const points = this.shape.points;
        const n = points.length;
        if (vertexIndex >= n || n < 3) return;

        const prev = points[(vertexIndex + n - 1) % n];
        const next = points[(vertexIndex + 1) % n];

        // 计算两边的方向
        const v1 = Vector.fromPoints(vertex, prev).normalize();
        const v2 = Vector.fromPoints(vertex, next).normalize();

        const arcRadius = 20;

        // 计算角度
        const angle1 = Math.atan2(v1.y, v1.x);
        const angle2 = Math.atan2(v2.y, v2.x);

        // 计算角平分线方向
        const bisectorDir = new Vector(v1.x + v2.x, v1.y + v2.y).normalize();
        const bisectorAngle = Math.atan2(bisectorDir.y, bisectorDir.x);

        ctx.save();
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = 1.5;

        // 绘制两个等角弧
        // 第一个弧（从 angle1 到 bisectorAngle）
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, arcRadius, angle1, bisectorAngle, this._isClockwise(angle1, bisectorAngle));
        ctx.stroke();

        // 第二个弧（从 bisectorAngle 到 angle2）
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, arcRadius, bisectorAngle, angle2, this._isClockwise(bisectorAngle, angle2));
        ctx.stroke();

        // 在两个弧上添加小线标记表示相等
        const markRadius = arcRadius;
        const midAngle1 = (angle1 + bisectorAngle) / 2;
        const midAngle2 = (bisectorAngle + angle2) / 2;

        this._drawEqualMark(ctx, vertex.x + Math.cos(midAngle1) * markRadius,
                           vertex.y + Math.sin(midAngle1) * markRadius, midAngle1);
        this._drawEqualMark(ctx, vertex.x + Math.cos(midAngle2) * markRadius,
                           vertex.y + Math.sin(midAngle2) * markRadius, midAngle2);

        ctx.restore();
    }

    // 判断弧是否顺时针
    _isClockwise(startAngle, endAngle) {
        let diff = endAngle - startAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        return diff < 0;
    }

    // 绘制相等标记（小斜线）
    _drawEqualMark(ctx, x, y, angle) {
        const markSize = 4;
        const perpAngle = angle + Math.PI / 2;

        ctx.beginPath();
        ctx.moveTo(x - Math.cos(perpAngle) * markSize, y - Math.sin(perpAngle) * markSize);
        ctx.lineTo(x + Math.cos(perpAngle) * markSize, y + Math.sin(perpAngle) * markSize);
        ctx.stroke();
    }

    // 绘制平行线标记
    _drawParallelMarks(ctx, start, end, throughPoint) {
        if (!throughPoint) return;

        // 计算方向
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;

        const dirX = dx / len;
        const dirY = dy / len;

        // 绘制平行符号（两条小箭头）
        ctx.save();
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = 2;

        const arrowSize = 6;
        const spacing = 4;

        // 计算平行符号的位置（在通过点附近）
        const markX = throughPoint.x;
        const markY = throughPoint.y;

        // 绘制两个平行的小箭头
        for (let offset of [-spacing, spacing]) {
            const perpX = -dirY * offset;
            const perpY = dirX * offset;

            ctx.beginPath();
            ctx.moveTo(markX + perpX - dirX * arrowSize, markY + perpY - dirY * arrowSize);
            ctx.lineTo(markX + perpX, markY + perpY);
            ctx.lineTo(markX + perpX - dirX * arrowSize * 0.7 - dirY * arrowSize * 0.5,
                      markY + perpY - dirY * arrowSize * 0.7 + dirX * arrowSize * 0.5);
            ctx.stroke();
        }

        ctx.restore();
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            shapeId: this.shape?.id,
            params: this.params,
            visible: this.visible,
            style: this.style
        };
    }

    static fromJSON(data, shape) {
        const auxLine = new AuxiliaryLine(data.type, shape, data.params);
        auxLine.id = data.id;
        auxLine.visible = data.visible;
        if (data.style) auxLine.style = { ...auxLine.style, ...data.style };
        return auxLine;
    }
}

// ============================================================================
// AuxiliaryLineManager 辅助线管理器
// ============================================================================
export class AuxiliaryLineManager {
    constructor(engine) {
        this.engine = engine;
        this.auxiliaryLines = [];

        // 交互状态
        this.isActive = false;
        this.currentMode = null;
        this.selectedElements = []; // { type: 'vertex'|'edge', index, shape, point? }
        this.hoveredElement = null;

        // 各图形类型支持的辅助线类型
        this.supportedTypes = {
            'point': [],
            'line': ['perpendicular-bisector', 'extension'],
            'triangle': ['connecting', 'median', 'altitude', 'perpendicular-bisector',
                         'angle-bisector', 'parallel', 'perpendicular', 'midline', 'extension'],
            'quadrilateral': ['connecting', 'median', 'altitude', 'perpendicular-bisector',
                              'angle-bisector', 'parallel', 'perpendicular', 'midline', 'extension'],
            'circle': [],
            'polygon': ['connecting', 'perpendicular-bisector', 'angle-bisector',
                        'parallel', 'perpendicular', 'midline', 'extension']
        };

        // 各辅助线类型需要的选择
        this.selectionRequirements = {
            'connecting': { count: 2, types: ['vertex', 'vertex'] },
            'median': { count: 1, types: ['vertex'] },
            'altitude': { count: 1, types: ['vertex'] },
            'perpendicular-bisector': { count: 1, types: ['edge'] },
            'angle-bisector': { count: 1, types: ['vertex'] },
            'parallel': { count: 2, types: ['vertex', 'edge'] },
            'perpendicular': { count: 2, types: ['vertex', 'edge'] },
            'midline': { count: 2, types: ['edge', 'edge'] },
            'extension': { count: 1, types: ['edge'] }
        };
    }

    // 获取当前图形支持的辅助线类型
    getAvailableTypes(shape) {
        if (!shape) return [];
        return this.supportedTypes[shape.type] || [];
    }

    // 获取当前选中图形支持的辅助线类型
    getAvailableTypesForCurrentShape() {
        const shapes = Array.from(this.engine.shapes.values());
        if (shapes.length === 0) return [];

        const selectedShape = shapes.find(s => s.selected) || shapes[0];
        return this.getAvailableTypes(selectedShape);
    }

    // 激活辅助线创建模式
    activate(mode) {
        const shapes = Array.from(this.engine.shapes.values());
        const hasValidShape = shapes.some(s => this.getAvailableTypes(s).includes(mode));

        if (!hasValidShape) {
            console.warn(`当前图形不支持 ${mode} 类型的辅助线`);
            return false;
        }

        this.isActive = true;
        this.currentMode = mode;
        this.selectedElements = [];
        this.hoveredElement = null;
        return true;
    }

    // 停用
    deactivate() {
        this.isActive = false;
        this.currentMode = null;
        this.selectedElements = [];
        this.hoveredElement = null;
    }

    // 查找点击位置的元素
    findElementAt(pos, tolerance = 15) {
        for (const shape of this.engine.shapes.values()) {
            if (!shape.points) continue;

            // 只在支持当前辅助线类型的图形上查找
            if (this.currentMode && !this.getAvailableTypes(shape).includes(this.currentMode)) {
                continue;
            }

            const n = shape.points.length;

            // 检查顶点
            for (let i = 0; i < n; i++) {
                const p = shape.points[i];
                if (this._distance(pos, p) <= tolerance) {
                    return { type: 'vertex', index: i, shape, point: p };
                }
            }

            // 检查边
            for (let i = 0; i < n; i++) {
                const p1 = shape.points[i];
                const p2 = shape.points[(i + 1) % n];
                if (this._isNearSegment(pos, p1, p2, tolerance)) {
                    return { type: 'edge', index: i, shape };
                }
            }
        }
        return null;
    }

    _distance(p1, p2) {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }

    _isNearSegment(point, segStart, segEnd, tolerance) {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return this._distance(point, segStart) <= tolerance;

        const t = Math.max(0, Math.min(1, ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / len2));
        const projX = segStart.x + t * dx;
        const projY = segStart.y + t * dy;
        return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2) <= tolerance;
    }

    // 处理点击
    handleClick(pos) {
        if (!this.isActive || !this.currentMode) return null;

        const element = this.findElementAt(pos);
        if (!element) return null;

        // 验证选择是否有效
        if (!this._isValidSelection(element)) return null;

        this.selectedElements.push(element);

        // 尝试创建辅助线
        return this._tryCreateAuxiliaryLine();
    }

    // 验证选择是否有效
    _isValidSelection(element) {
        const req = this.selectionRequirements[this.currentMode];
        if (!req) return false;

        const currentIndex = this.selectedElements.length;
        if (currentIndex >= req.count) return false;

        // 检查类型是否匹配
        const expectedTypes = req.types;
        if (currentIndex < expectedTypes.length) {
            const expected = expectedTypes[currentIndex];
            // 'vertex' 或 'edge'，或者混合类型（如 parallel/perpendicular）
            if (expected === element.type) return true;

            // parallel 和 perpendicular 可以先选顶点或先选边
            if (this.currentMode === 'parallel' || this.currentMode === 'perpendicular') {
                if (currentIndex === 0) return element.type === 'vertex' || element.type === 'edge';
                if (currentIndex === 1) {
                    const firstType = this.selectedElements[0].type;
                    return (firstType === 'vertex' && element.type === 'edge') ||
                           (firstType === 'edge' && element.type === 'vertex');
                }
            }
        }

        return false;
    }

    // 尝试创建辅助线
    _tryCreateAuxiliaryLine() {
        const req = this.selectionRequirements[this.currentMode];
        if (!req || this.selectedElements.length < req.count) return null;

        const sel = this.selectedElements;
        let auxLine = null;

        switch (this.currentMode) {
            case 'connecting':
                if (sel[0].shape === sel[1].shape) {
                    auxLine = new AuxiliaryLine('connecting', sel[0].shape, {
                        vertexIndex1: sel[0].index,
                        vertexIndex2: sel[1].index
                    });
                }
                break;

            case 'median':
                auxLine = new AuxiliaryLine('median', sel[0].shape, {
                    vertexIndex: sel[0].index
                });
                break;

            case 'altitude':
                auxLine = new AuxiliaryLine('altitude', sel[0].shape, {
                    vertexIndex: sel[0].index
                });
                break;

            case 'perpendicular-bisector':
                auxLine = new AuxiliaryLine('perpendicular-bisector', sel[0].shape, {
                    edgeIndex: sel[0].index
                });
                break;

            case 'angle-bisector':
                auxLine = new AuxiliaryLine('angle-bisector', sel[0].shape, {
                    vertexIndex: sel[0].index
                });
                break;

            case 'parallel': {
                const vertexSel = sel.find(s => s.type === 'vertex');
                const edgeSel = sel.find(s => s.type === 'edge');
                if (vertexSel && edgeSel && vertexSel.shape === edgeSel.shape) {
                    auxLine = new AuxiliaryLine('parallel', vertexSel.shape, {
                        throughVertexIndex: vertexSel.index,
                        parallelToEdgeIndex: edgeSel.index
                    });
                }
                break;
            }

            case 'perpendicular': {
                const vertexSel = sel.find(s => s.type === 'vertex');
                const edgeSel = sel.find(s => s.type === 'edge');
                if (vertexSel && edgeSel && vertexSel.shape === edgeSel.shape) {
                    auxLine = new AuxiliaryLine('perpendicular', vertexSel.shape, {
                        throughVertexIndex: vertexSel.index,
                        perpendicularToEdgeIndex: edgeSel.index
                    });
                }
                break;
            }

            case 'midline':
                if (sel[0].shape === sel[1].shape) {
                    auxLine = new AuxiliaryLine('midline', sel[0].shape, {
                        edgeIndex1: sel[0].index,
                        edgeIndex2: sel[1].index
                    });
                }
                break;

            case 'extension':
                auxLine = new AuxiliaryLine('extension', sel[0].shape, {
                    edgeIndex: sel[0].index,
                    direction: 'both'
                });
                break;
        }

        if (auxLine) {
            this.auxiliaryLines.push(auxLine);
            this.selectedElements = [];
            return auxLine;
        }

        return null;
    }

    // 设置悬停元素
    setHoveredElement(pos) {
        this.hoveredElement = this.findElementAt(pos);
    }

    // 删除最后一条辅助线
    removeLastAuxiliaryLine() {
        return this.auxiliaryLines.pop() || null;
    }

    // 清除所有辅助线
    clearAll() {
        this.auxiliaryLines = [];
        this.selectedElements = [];
    }

    // 绘制
    draw(ctx) {
        // 绘制所有辅助线
        for (const auxLine of this.auxiliaryLines) {
            auxLine.draw(ctx);
        }

        // 绘制交互状态
        if (this.isActive) {
            this._drawInteractionState(ctx);
        }
    }

    _drawInteractionState(ctx) {
        const renderer = new Renderer2D(ctx);

        // 高亮悬停元素
        if (this.hoveredElement) {
            this._highlightElement(renderer, this.hoveredElement, 'rgba(245, 158, 11, 0.6)');
        }

        // 绘制已选中的元素
        for (const sel of this.selectedElements) {
            this._highlightElement(renderer, sel, '#f59e0b');
        }

        // 显示提示
        this._drawHint(ctx);
    }

    _highlightElement(renderer, element, color) {
        if (element.type === 'vertex') {
            renderer.drawPoint(element.point, { radius: 10, color, label: '' });
        } else if (element.type === 'edge') {
            const p1 = element.shape.points[element.index];
            const p2 = element.shape.points[(element.index + 1) % element.shape.points.length];
            renderer.drawLine(p1, p2, { color, lineWidth: 4 });
        }
    }

    _drawHint(ctx) {
        const req = this.selectionRequirements[this.currentMode];
        if (!req) return;

        const remaining = req.count - this.selectedElements.length;
        const hints = {
            'connecting': remaining === 2 ? '点击第一个顶点' : '点击第二个顶点',
            'median': '点击一个顶点',
            'altitude': '点击一个顶点',
            'perpendicular-bisector': '点击一条边',
            'angle-bisector': '点击一个顶点',
            'parallel': this.selectedElements.length === 0 ? '点击顶点或边' :
                        (this.selectedElements[0].type === 'vertex' ? '点击一条边' : '点击一个顶点'),
            'perpendicular': this.selectedElements.length === 0 ? '点击顶点或边' :
                             (this.selectedElements[0].type === 'vertex' ? '点击一条边' : '点击一个顶点'),
            'midline': remaining === 2 ? '点击第一条边' : '点击第二条边',
            'extension': '点击一条边'
        };

        const hint = hints[this.currentMode] || '';
        if (!hint) return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.font = '14px sans-serif';
        const textWidth = ctx.measureText(hint).width;
        ctx.fillRect(8, 8, textWidth + 16, 28);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(hint, 16, 14);
    }

    // 序列化
    toJSON() {
        return this.auxiliaryLines.map(a => a.toJSON());
    }

    // 从 JSON 恢复
    loadFromJSON(data, getShapeById) {
        this.auxiliaryLines = [];
        for (const auxData of data) {
            const shape = getShapeById(auxData.shapeId);
            if (shape) {
                this.auxiliaryLines.push(AuxiliaryLine.fromJSON(auxData, shape));
            }
        }
    }
}
