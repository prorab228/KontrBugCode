class CanvasRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.initEvents();
    }

    initEvents() {
        // Масштабирование колесиком мыши
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = 0.1;
            const oldScale = this.scale;

            // Масштабируем относительно позиции мыши
            const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;

            const worldX = (mouseX - this.offsetX) / oldScale;
            const worldY = (mouseY - this.offsetY) / oldScale;

            if (e.deltaY < 0) {
                // Увеличение
                this.scale = Math.min(5, this.scale * (1 + zoomFactor));
            } else {
                // Уменьшение
                this.scale = Math.max(0.1, this.scale * (1 - zoomFactor));
            }

            // Корректируем смещение для сохранения позиции под курсором
            this.offsetX = mouseX - worldX * this.scale;
            this.offsetY = mouseY - worldY * this.scale;
        });

        // Панорамирование
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Средняя кнопка или Ctrl+ЛКМ
                this.isPanning = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;

                this.offsetX += dx;
                this.offsetY += dy;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1 || e.button === 0) {
                this.isPanning = false;
                this.canvas.style.cursor = 'default';
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        });
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.scale,
            y: (y - this.offsetY) / this.scale
        };
    }

    worldToScreen(x, y) {
        return {
            x: x * this.scale + this.offsetX,
            y: y * this.scale + this.offsetY
        };
    }

    drawGrid(ctx) {
        const gridSize = 20 * this.scale;
        const startX = -this.offsetX % gridSize;
        const startY = -this.offsetY % gridSize;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        // Вертикальные линии
        for (let x = startX; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        // Горизонтальные линии
        for (let y = startY; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Основные линии (каждые 5)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        const majorGridSize = gridSize * 5;
        const majorStartX = -this.offsetX % majorGridSize;
        const majorStartY = -this.offsetY % majorGridSize;

        for (let x = majorStartX; x < this.canvas.width; x += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        for (let y = majorStartY; y < this.canvas.height; y += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }

    drawBackground(ctx) {
        // Фон
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Сетка
        this.drawGrid(ctx);
    }

    drawComponents(ctx, components) {
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        components.forEach(component => {
            component.draw(ctx);
        });

        ctx.restore();
    }

    drawWires(ctx, wires) {
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        wires.forEach(wire => {
            wire.draw(ctx);
        });

        ctx.restore();
    }

    drawNodes(ctx, nodes) {
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        nodes.forEach(node => {
            node.draw(ctx);
        });

        ctx.restore();
    }

    drawSelection(ctx, selectedComponent) {
        if (!selectedComponent) return;

        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        if (selectedComponent.drawSelection) {
            selectedComponent.drawSelection(ctx);
        }

        ctx.restore();
    }

    drawOverlay(ctx, simulator) {
        // Информация о масштабе
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 150, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Масштаб: ${this.scale.toFixed(2)}x`, 20, 30);

        const mousePos = simulator.mousePosition;
        if (mousePos) {
            const worldPos = this.screenToWorld(mousePos.x, mousePos.y);
            ctx.fillText(`X: ${Math.round(worldPos.x)}`, 20, 50);
            ctx.fillText(`Y: ${Math.round(worldPos.y)}`, 20, 70);
        }

        // Индикатор выбранного инструмента
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width - 160, 10, 150, 30);

        ctx.fillStyle = '#ffffff';
        let toolName = '';
        switch(simulator.selectedTool) {
            case 'select': toolName = 'Выбор'; break;
            case 'wire': toolName = 'Провод'; break;
            case 'delete': toolName = 'Удаление'; break;
        }
        ctx.fillText(`Инструмент: ${toolName}`, this.canvas.width - 150, 30);
    }

    resetView() {
        this.scale = 1.0;
        this.offsetX = this.canvas.width / 2 - 400;
        this.offsetY = this.canvas.height / 2 - 300;
    }

    fitToContent(components) {
        if (components.length === 0) {
            this.resetView();
            return;
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        components.forEach(component => {
            minX = Math.min(minX, component.x);
            maxX = Math.max(maxX, component.x + component.width);
            minY = Math.min(minY, component.y);
            maxY = Math.max(maxY, component.y + component.height);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const centerX = minX + contentWidth / 2;
        const centerY = minY + contentHeight / 2;

        // Масштаб, чтобы все поместилось
        const scaleX = this.canvas.width / (contentWidth + 200);
        const scaleY = this.canvas.height / (contentHeight + 200);
        this.scale = Math.min(scaleX, scaleY, 2);

        // Центрируем
        this.offsetX = this.canvas.width / 2 - centerX * this.scale;
        this.offsetY = this.canvas.height / 2 - centerY * this.scale;
    }
}