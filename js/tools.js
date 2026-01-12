/**
 * 工具模块
 * 包含测量工具、绘制工具、动画工具
 */

import { Point, Vector, GeometryUtils } from './geometry-engine.js';
import { Renderer2D } from './renderer.js';

// ============================================================================
// MeasureTool - 测量工具
// ============================================================================
export class MeasureTool {
    constructor(engine) {
        this.engine = engine;
        this.isActive = false;
        this.measureType = 'distance'; // 'distance', 'angle'
        this.points = [];
        this.result = null;
    }

    activate(type = 'distance') {
        this.isActive = true;
        this.measureType = type;
        this.points = [];
        this.result = null;
        this.engine.canvas.style.cursor = 'crosshair';
    }

    deactivate() {
        this.isActive = false;
        this.points = [];
        this.result = null;
        this.engine.canvas.style.cursor = 'default';
    }

    addPoint(point) {
        if (!this.isActive) return;

        this.points.push(point.clone());

        if (this.measureType === 'distance' && this.points.length === 2) {
            this.result = this.points[0].distanceTo(this.points[1]);
            this.engine._emit('measure', {
                type: 'distance',
                value: this.result,
                points: this.points
            });
        } else if (this.measureType === 'angle' && this.points.length === 3) {
            const angle = GeometryUtils.angleFromThreePoints(
                this.points[0],
                this.points[1],
                this.points[2]
            );
            this.result = GeometryUtils.radToDeg(angle);
            this.engine._emit('measure', {
                type: 'angle',
                value: this.result,
                points: this.points
            });
        }
    }

    draw(ctx) {
        if (!this.isActive || this.points.length === 0) return;

        const renderer = new Renderer2D(ctx);

        // 绘制已选择的点
        for (let i = 0; i < this.points.length; i++) {
            renderer.drawPoint(this.points[i], {
                radius: 6,
                color: '#ef4444',
                label: ''
            });
        }

        // 绘制连线
        if (this.points.length >= 2) {
            renderer.drawLine(this.points[0], this.points[1], {
                color: '#ef4444',
                lineWidth: 2,
                dashed: true
            });

            // 显示距离
            const mid = Point.midpoint(this.points[0], this.points[1]);
            const dist = this.points[0].distanceTo(this.points[1]);
            renderer.drawText(dist.toFixed(1), new Point(mid.x, mid.y - 15), {
                color: '#ef4444',
                font: 'bold 14px sans-serif'
            });
        }

        // 绘制角度
        if (this.measureType === 'angle' && this.points.length >= 2) {
            renderer.drawLine(this.points[0], this.points[1], {
                color: '#ef4444',
                lineWidth: 2,
                dashed: true
            });

            if (this.points.length === 3) {
                renderer.drawLine(this.points[1], this.points[2], {
                    color: '#ef4444',
                    lineWidth: 2,
                    dashed: true
                });

                // 绘制角度弧
                renderer.drawAngle(this.points[1], this.points[0], this.points[2], this.result, {
                    fillColor: 'rgba(239, 68, 68, 0.3)',
                    labelColor: '#ef4444'
                });
            }
        }
    }

    reset() {
        this.points = [];
        this.result = null;
    }
}

// ============================================================================
// DrawTool - 绘制工具
// ============================================================================
export class DrawTool {
    constructor(engine) {
        this.engine = engine;
        this.isActive = false;
        this.drawType = 'point'; // 'point', 'line', 'polygon'
        this.points = [];
        this.tempPoint = null;
    }

    activate(type = 'point') {
        this.isActive = true;
        this.drawType = type;
        this.points = [];
        this.tempPoint = null;
        this.engine.canvas.style.cursor = 'crosshair';
    }

    deactivate() {
        this.isActive = false;
        this.points = [];
        this.tempPoint = null;
        this.engine.canvas.style.cursor = 'default';
    }

    addPoint(point) {
        if (!this.isActive) return null;

        this.points.push(point.clone());

        // 根据类型判断是否完成
        if (this.drawType === 'point') {
            const shape = this._createShape();
            this.reset();
            return shape;
        } else if (this.drawType === 'line' && this.points.length === 2) {
            const shape = this._createShape();
            this.reset();
            return shape;
        }

        return null;
    }

    complete() {
        if (!this.isActive) return null;

        if (this.drawType === 'polygon' && this.points.length >= 3) {
            const shape = this._createShape();
            this.reset();
            return shape;
        }

        return null;
    }

    setTempPoint(point) {
        this.tempPoint = point;
    }

    _createShape() {
        // 动态导入以避免循环依赖
        const shapes2d = import('./shapes-2d.js');

        switch (this.drawType) {
            case 'point':
                // 返回形状数据，由 app.js 创建
                return {
                    type: 'point',
                    x: this.points[0].x,
                    y: this.points[0].y
                };

            case 'line':
                return {
                    type: 'segment',
                    x1: this.points[0].x,
                    y1: this.points[0].y,
                    x2: this.points[1].x,
                    y2: this.points[1].y
                };

            case 'polygon':
                return {
                    type: 'polygon-custom',
                    points: this.points.map(p => ({ x: p.x, y: p.y }))
                };

            default:
                return null;
        }
    }

    draw(ctx) {
        if (!this.isActive || this.points.length === 0) return;

        const renderer = new Renderer2D(ctx);

        // 绘制已选择的点
        for (let i = 0; i < this.points.length; i++) {
            renderer.drawPoint(this.points[i], {
                radius: 6,
                color: '#10b981',
                label: ''
            });
        }

        // 绘制已有的线
        for (let i = 0; i < this.points.length - 1; i++) {
            renderer.drawLine(this.points[i], this.points[i + 1], {
                color: '#10b981',
                lineWidth: 2
            });
        }

        // 绘制临时线（到鼠标位置）
        if (this.tempPoint && this.points.length > 0) {
            renderer.drawLine(this.points[this.points.length - 1], this.tempPoint, {
                color: '#10b981',
                lineWidth: 2,
                dashed: true
            });

            // 多边形：显示闭合预览
            if (this.drawType === 'polygon' && this.points.length >= 2) {
                renderer.drawLine(this.tempPoint, this.points[0], {
                    color: 'rgba(16, 185, 129, 0.5)',
                    lineWidth: 1,
                    dashed: true
                });
            }
        }
    }

    reset() {
        this.points = [];
        this.tempPoint = null;
    }
}

// ============================================================================
// AnimationTool - 动画工具
// ============================================================================
export class AnimationTool {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.currentAnimation = null;
        this.animationFrame = null;
        this.startTime = 0;
        this.duration = 2000; // 默认 2 秒
        this.onComplete = null;
    }

    // 播放旋转动画
    playRotation(shape, totalAngle = Math.PI * 2, duration = 2000) {
        this.stop();
        this.duration = duration;
        this.isPlaying = true;
        this.startTime = performance.now();

        const startAngles = shape.points.map(p => ({ x: p.x, y: p.y }));
        const center = shape.getCenter();

        const animate = (currentTime) => {
            const elapsed = currentTime - this.startTime;
            const progress = Math.min(elapsed / this.duration, 1);

            // 缓动函数
            const easeProgress = this._easeInOutCubic(progress);
            const currentAngle = totalAngle * easeProgress;

            // 恢复初始位置并应用新旋转
            for (let i = 0; i < shape.points.length; i++) {
                const dx = startAngles[i].x - center.x;
                const dy = startAngles[i].y - center.y;
                const cos = Math.cos(currentAngle);
                const sin = Math.sin(currentAngle);
                shape.points[i].x = center.x + dx * cos - dy * sin;
                shape.points[i].y = center.y + dx * sin + dy * cos;
            }

            this.engine.render();

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.isPlaying = false;
                if (this.onComplete) this.onComplete();
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    // 播放缩放动画
    playScale(shape, targetScale = 1.5, duration = 1000) {
        this.stop();
        this.duration = duration;
        this.isPlaying = true;
        this.startTime = performance.now();

        const center = shape.getCenter();
        const startPositions = shape.points.map(p => ({
            dx: p.x - center.x,
            dy: p.y - center.y
        }));

        const animate = (currentTime) => {
            const elapsed = currentTime - this.startTime;
            const progress = Math.min(elapsed / this.duration, 1);

            // 缓动：先放大后恢复
            const easeProgress = this._easeInOutCubic(progress);
            const currentScale = 1 + (targetScale - 1) * Math.sin(easeProgress * Math.PI);

            for (let i = 0; i < shape.points.length; i++) {
                shape.points[i].x = center.x + startPositions[i].dx * currentScale;
                shape.points[i].y = center.y + startPositions[i].dy * currentScale;
            }

            this.engine.render();

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.isPlaying = false;
                if (this.onComplete) this.onComplete();
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    // 播放变形动画（从一个形状变到另一个）
    playMorph(shape, targetPoints, duration = 1500) {
        this.stop();

        if (shape.points.length !== targetPoints.length) {
            console.error('Point count mismatch');
            return;
        }

        this.duration = duration;
        this.isPlaying = true;
        this.startTime = performance.now();

        const startPoints = shape.points.map(p => ({ x: p.x, y: p.y }));

        const animate = (currentTime) => {
            const elapsed = currentTime - this.startTime;
            const progress = Math.min(elapsed / this.duration, 1);
            const easeProgress = this._easeInOutCubic(progress);

            for (let i = 0; i < shape.points.length; i++) {
                shape.points[i].x = startPoints[i].x + (targetPoints[i].x - startPoints[i].x) * easeProgress;
                shape.points[i].y = startPoints[i].y + (targetPoints[i].y - startPoints[i].y) * easeProgress;
            }

            this.engine.render();

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.isPlaying = false;
                if (this.onComplete) this.onComplete();
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    // 播放 3D 旋转动画
    play3DRotation(shape, axis = 'y', totalAngle = Math.PI * 2, duration = 3000, renderCallback = null) {
        this.stop();
        this.duration = duration;
        this.isPlaying = true;
        this.startTime = performance.now();

        let lastAngle = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - this.startTime;
            const progress = Math.min(elapsed / this.duration, 1);
            const easeProgress = this._easeInOutCubic(progress);
            const currentAngle = totalAngle * easeProgress;
            const deltaAngle = currentAngle - lastAngle;
            lastAngle = currentAngle;

            // 根据轴旋转
            switch (axis) {
                case 'x':
                    shape.rotate3D(deltaAngle, 0, 0);
                    break;
                case 'y':
                    shape.rotate3D(0, deltaAngle, 0);
                    break;
                case 'z':
                    shape.rotate3D(0, 0, deltaAngle);
                    break;
            }

            // 使用回调渲染（支持自定义渲染逻辑）
            if (renderCallback) {
                renderCallback();
            } else {
                this.engine.render();
            }

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.isPlaying = false;
                if (this.onComplete) this.onComplete();
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    // 停止动画
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.isPlaying = false;
    }

    // 缓动函数
    _easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    _easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 :
            Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
}

// ============================================================================
// TransformTool - 几何变换工具
// ============================================================================
export class TransformTool {
    constructor(engine) {
        this.engine = engine;
    }

    // 平移
    translate(shape, dx, dy, animated = false, duration = 500) {
        if (animated) {
            const animation = new AnimationTool(this.engine);
            const targetPoints = shape.points.map(p => new Point(p.x + dx, p.y + dy));
            animation.playMorph(shape, targetPoints, duration);
        } else {
            shape.translate(dx, dy);
            this.engine.render();
        }
    }

    // 旋转
    rotate(shape, angle, center = null, animated = false, duration = 500) {
        if (animated) {
            const animation = new AnimationTool(this.engine);
            animation.playRotation(shape, angle, duration);
        } else {
            shape.rotate(angle, center);
            this.engine.render();
        }
    }

    // 轴对称（关于直线）
    reflectAcrossLine(shape, lineP1, lineP2, animated = false, duration = 500) {
        const targetPoints = shape.points.map(p => {
            // 计算点关于直线的对称点
            const dx = lineP2.x - lineP1.x;
            const dy = lineP2.y - lineP1.y;
            const len2 = dx * dx + dy * dy;

            if (len2 === 0) return p.clone();

            const t = ((p.x - lineP1.x) * dx + (p.y - lineP1.y) * dy) / len2;
            const projX = lineP1.x + t * dx;
            const projY = lineP1.y + t * dy;

            return new Point(2 * projX - p.x, 2 * projY - p.y);
        });

        if (animated) {
            const animation = new AnimationTool(this.engine);
            animation.playMorph(shape, targetPoints, duration);
        } else {
            for (let i = 0; i < shape.points.length; i++) {
                shape.points[i].x = targetPoints[i].x;
                shape.points[i].y = targetPoints[i].y;
            }
            this.engine.render();
        }
    }

    // 中心对称
    reflectAcrossPoint(shape, center, animated = false, duration = 500) {
        const targetPoints = shape.points.map(p =>
            new Point(2 * center.x - p.x, 2 * center.y - p.y)
        );

        if (animated) {
            const animation = new AnimationTool(this.engine);
            animation.playMorph(shape, targetPoints, duration);
        } else {
            for (let i = 0; i < shape.points.length; i++) {
                shape.points[i].x = targetPoints[i].x;
                shape.points[i].y = targetPoints[i].y;
            }
            this.engine.render();
        }
    }

    // 缩放
    scale(shape, factor, center = null, animated = false, duration = 500) {
        if (animated) {
            const animation = new AnimationTool(this.engine);
            animation.playScale(shape, factor, duration);
        } else {
            shape.scale(factor, center);
            this.engine.render();
        }
    }
}

// ============================================================================
// LegacyAuxiliaryLineTool - 旧版辅助线工具（兼容层，已弃用）
// 新代码请使用 auxiliary.js 中的 AuxiliaryLineManager
// ============================================================================
export class AuxiliaryLineTool {
    constructor(engine) {
        this.engine = engine;
        this.auxiliaryLines = [];
        console.warn('AuxiliaryLineTool is deprecated. Use AuxiliaryLineManager from auxiliary.js instead.');
    }

    // 兼容方法：空实现
    activate() {}
    deactivate() {}
    addPoint() { return null; }
    setTempPoint() {}
    clearAll() { this.auxiliaryLines = []; }
    draw() {}
    reset() {}
}

// ============================================================================
// 导出工厂函数
// ============================================================================
export function createTools(engine) {
    return {
        measure: new MeasureTool(engine),
        draw: new DrawTool(engine),
        animation: new AnimationTool(engine),
        transform: new TransformTool(engine),
        auxiliary: new AuxiliaryLineTool(engine)
    };
}
