class WireTool {
    constructor(simulator) {
        this.simulator = simulator;
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.startTerminal = null;
    }

    startWire(x, y) {
        // Ищем терминал в точке начала
        for (const component of this.simulator.components) {
            const terminal = component.getTerminalAt(x, y);
            if (terminal) {
                this.startTerminal = terminal;
                this.startPoint = { x: terminal.x, y: terminal.y };
                this.currentPoint = { x, y };
                this.isDrawing = true;
                return;
            }
        }

        // Если не нашли терминал, начинаем с произвольной точки
        this.startPoint = { x, y };
        this.currentPoint = { x, y };
        this.isDrawing = true;
    }

    updateWire(x, y) {
        if (this.isDrawing) {
            this.currentPoint = { x, y };
        }
    }

    finishWire(x, y) {
        if (!this.isDrawing) return;

        // Ищем терминал в точке окончания
        let endTerminal = null;
        let endComponent = null;

        for (const component of this.simulator.components) {
            const terminal = component.getTerminalAt(x, y);
            if (terminal && terminal !== this.startTerminal) {
                endTerminal = terminal;
                endComponent = component;
                break;
            }
        }

        if (this.startTerminal && endTerminal) {
            // Создаем провод между терминалами
            const startComponent = this.findComponentByTerminal(this.startTerminal);
            if (startComponent && endComponent) {
                const wire = new Wire(startComponent, this.startTerminal, endComponent, endTerminal);
                this.simulator.addWire(wire);
            }
        } else if (this.startTerminal) {
            // Провод от терминала к свободной точке (пока не поддерживается)
            console.log('Провод должен заканчиваться на терминале компонента');
        } else {
            // Провод между двумя свободными точками (для узлов)
            // Создаем узел цепи
            const node = new CircuitNode(x, y);
            // В реальном проекте здесь будет сложная логика
        }

        this.reset();
    }

    findComponentByTerminal(terminal) {
        for (const component of this.simulator.components) {
            if (component.terminals.includes(terminal)) {
                return component;
            }
        }
        return null;
    }

    cancel() {
        this.reset();
    }

    reset() {
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.startTerminal = null;
    }

    drawPreview(ctx) {
        if (this.isDrawing && this.startPoint && this.currentPoint) {
            // Рисуем временный провод
            ctx.beginPath();
            ctx.moveTo(this.startPoint.x, this.startPoint.y);

            // Изогнутая линия
            const dx = this.currentPoint.x - this.startPoint.x;
            const dy = this.currentPoint.y - this.startPoint.y;

            if (Math.sqrt(dx * dx + dy * dy) > 50) {
                const cp1x = this.startPoint.x + dx * 0.5;
                const cp1y = this.startPoint.y - dy * 0.3;
                const cp2x = this.startPoint.x + dx * 0.5;
                const cp2y = this.startPoint.y + dy * 1.3;

                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, this.currentPoint.x, this.currentPoint.y);
            } else {
                ctx.lineTo(this.currentPoint.x, this.currentPoint.y);
            }

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Кружок в начале
            ctx.beginPath();
            ctx.arc(this.startPoint.x, this.startPoint.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff00';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Кружок в конце (текущая позиция)
            ctx.beginPath();
            ctx.arc(this.currentPoint.x, this.currentPoint.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = this.startTerminal ? '#00ff00' : '#ff0000';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}