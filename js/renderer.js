/**
 * 渲染器模块
 * 包含 2D Canvas 渲染器
 */

import { Point } from './geometry-engine.js';

// ============================================================================
// Renderer2D - 2D Canvas 渲染器
// ============================================================================
export class Renderer2D {
    constructor(ctx) {
        this.ctx = ctx;
    }

    clear(width, height) {
        this.ctx.clearRect(0, 0, width, height);
    }

    // 绘制点
    drawPoint(point, style = {}) {
        const ctx = this.ctx;
        const radius = style.radius || 8;
        const color = style.color || '#764ba2';
        const label = style.label || '';
        const isHovered = style.isHovered || false;
        const isSelected = style.isSelected || false;

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);

        if (isSelected || isHovered) {
            ctx.fillStyle = style.hoverColor || '#667eea';
            ctx.shadowColor = style.hoverColor || '#667eea';
            ctx.shadowBlur = isSelected ? 15 : 10;
        } else {
            ctx.fillStyle = color;
            ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // 绘制标签
        if (label) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.max(10, radius)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, point.x, point.y);
        }
    }

    // 绘制线段
    drawLine(p1, p2, style = {}) {
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        ctx.strokeStyle = style.color || '#667eea';
        ctx.lineWidth = style.lineWidth || 2;

        if (style.dashed) {
            ctx.setLineDash(style.dashPattern || [5, 5]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 绘制多边形
    drawPolygon(points, style = {}) {
        if (points.length < 2) return;

        const ctx = this.ctx;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.closePath();

        // 填充
        if (style.fillColor) {
            ctx.fillStyle = style.fillColor;
            ctx.fill();
        }

        // 描边
        if (style.strokeColor) {
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.lineWidth || 2;
            ctx.stroke();
        }
    }

    // 绘制圆
    drawCircle(center, radius, style = {}) {
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);

        if (style.fillColor) {
            ctx.fillStyle = style.fillColor;
            ctx.fill();
        }

        if (style.strokeColor) {
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.lineWidth || 2;
            ctx.stroke();
        }
    }

    // 绘制弧
    drawArc(center, radius, startAngle, endAngle, style = {}) {
        const ctx = this.ctx;

        ctx.beginPath();

        if (style.sector) {
            // 扇形
            ctx.moveTo(center.x, center.y);
            ctx.arc(center.x, center.y, radius, startAngle, endAngle, style.counterClockwise);
            ctx.closePath();
        } else {
            // 弧线
            ctx.arc(center.x, center.y, radius, startAngle, endAngle, style.counterClockwise);
        }

        if (style.fillColor) {
            ctx.fillStyle = style.fillColor;
            ctx.fill();
        }

        if (style.strokeColor) {
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.lineWidth || 2;
            ctx.stroke();
        }
    }

    // 绘制文本
    drawText(text, position, style = {}) {
        const ctx = this.ctx;

        ctx.fillStyle = style.color || '#374151';
        ctx.font = style.font || 'bold 14px sans-serif';
        ctx.textAlign = style.align || 'center';
        ctx.textBaseline = style.baseline || 'middle';
        ctx.fillText(text, position.x, position.y);
    }

    // 绘制角度标记
    drawAngle(vertex, p1, p2, angle, style = {}) {
        const ctx = this.ctx;
        const radius = style.radius || 25;

        // 计算起始和结束角度
        const startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
        const endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);

        // 计算叉积确定方向
        const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
        const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
        const cross = v1.x * v2.y - v1.y * v2.x;
        const counterClockwise = cross > 0;

        // 绘制扇形
        ctx.beginPath();
        ctx.moveTo(vertex.x, vertex.y);
        ctx.arc(vertex.x, vertex.y, radius, startAngle, endAngle, counterClockwise);
        ctx.closePath();
        ctx.fillStyle = style.fillColor || 'rgba(102, 126, 234, 0.6)';
        ctx.fill();

        // 计算标签位置
        let midAngle;
        if (counterClockwise) {
            let diff = startAngle - endAngle;
            if (diff < 0) diff += 2 * Math.PI;
            midAngle = endAngle + diff / 2;
        } else {
            let diff = endAngle - startAngle;
            if (diff < 0) diff += 2 * Math.PI;
            midAngle = startAngle + diff / 2;
        }

        const labelDistance = style.labelDistance || 45;
        const labelX = vertex.x + Math.cos(midAngle) * labelDistance;
        const labelY = vertex.y + Math.sin(midAngle) * labelDistance;

        // 绘制角度值
        if (style.showValue !== false) {
            ctx.fillStyle = style.labelColor || '#374151';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(angle.toFixed(0) + '°', labelX, labelY);
        }
    }

    // 绘制边长标签
    drawSideLength(p1, p2, length, style = {}) {
        const ctx = this.ctx;
        const mid = Point.midpoint(p1, p2);

        // 计算垂直偏移方向
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const offset = style.offset || 20;
        const offsetX = -dy / d * offset;
        const offsetY = dx / d * offset;

        ctx.fillStyle = style.color || '#667eea';
        ctx.font = style.font || 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(length.toFixed(0), mid.x + offsetX, mid.y + offsetY);
    }

    // 绘制旋转控制点
    drawRotateHandle(center, style = {}) {
        const ctx = this.ctx;
        const radius = style.radius || 16;
        const color = style.color || '#10b981';
        const isHovered = style.isHovered || false;
        const isActive = style.isActive || false;

        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);

        if (isActive) {
            ctx.fillStyle = style.activeColor || '#059669';
            ctx.shadowColor = style.activeColor || '#059669';
            ctx.shadowBlur = 20;
        } else if (isHovered) {
            ctx.fillStyle = style.activeColor || '#059669';
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = color;
            ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // 绘制旋转图标
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 7, -Math.PI * 0.7, Math.PI * 0.5);
        ctx.stroke();

        // 箭头
        ctx.beginPath();
        ctx.moveTo(center.x + 4, center.y + 7);
        ctx.lineTo(center.x + 8, center.y + 4);
        ctx.lineTo(center.x + 5, center.y + 2);
        ctx.stroke();
    }
}

// ============================================================================
// 导出渲染器工厂
// ============================================================================
export function createRenderer(ctx) {
    return new Renderer2D(ctx);
}
