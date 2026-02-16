class CircuitNode {
    constructor(x, y) {
        this.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.x = x;
        this.y = y;
        this.voltage = 0;          // Напряжение в узле
        this.connections = [];     // Подключенные компоненты и провода
        this.isGround = false;     // Является ли узлом земли
    }

    addConnection(component, terminal) {
        this.connections.push({
            component,
            terminal,
            type: 'component'
        });
    }

    addWire(wire, isStart) {
        this.connections.push({
            wire,
            isStart,
            type: 'wire'
        });
    }

    removeConnection(component) {
        this.connections = this.connections.filter(conn =>
            !(conn.component === component || conn.wire === component)
        );
    }

    calculateVoltage(connectedComponents) {
        // Расчет напряжения в узле методом узловых потенциалов
        // Упрощенная версия для обучения

        if (this.isGround) {
            this.voltage = 0;
            return 0;
        }

        // Ищем источники напряжения, подключенные к узлу
        let totalVoltage = 0;
        let totalResistance = 0;
        let sourceCount = 0;

        for (const conn of this.connections) {
            if (conn.type === 'component') {
                const component = conn.component;

                if (component instanceof Battery ||
                    (component instanceof Arduino && conn.terminal.name.includes('V'))) {
                    // Источник напряжения
                    totalVoltage += component.voltage;
                    sourceCount++;
                } else if (component.resistance > 0) {
                    // Резистивный элемент
                    totalResistance += component.resistance;
                }
            }
        }

        if (sourceCount > 0) {
            // Среднее напряжение источников
            this.voltage = totalVoltage / sourceCount;
        } else if (totalResistance > 0) {
            // Для резистивного делителя
            this.voltage = 5; // По умолчанию 5V, в реальном проекте будет сложнее
        }

        return this.voltage;
    }

    draw(ctx) {
        // Рисуем узел как точку соединения
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = this.isGround ? '#95a5a6' : '#3498db';
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Если узел выбран
        if (this.selected) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Показываем напряжение
        if (this.voltage > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.voltage.toFixed(1)}V`, this.x, this.y - 10);
        }

        // Обозначение земли
        if (this.isGround) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();

            // Символ земли
            const groundSize = 8;
            ctx.moveTo(this.x - groundSize, this.y + groundSize);
            ctx.lineTo(this.x + groundSize, this.y + groundSize);

            ctx.moveTo(this.x - groundSize/2, this.y + groundSize);
            ctx.lineTo(this.x - groundSize/2, this.y + groundSize*1.5);

            ctx.moveTo(this.x + groundSize/2, this.y + groundSize);
            ctx.lineTo(this.x + groundSize/2, this.y + groundSize*1.5);

            ctx.moveTo(this.x - groundSize, this.y + groundSize*1.5);
            ctx.lineTo(this.x + groundSize, this.y + groundSize*1.5);

            ctx.stroke();
        }
    }
}