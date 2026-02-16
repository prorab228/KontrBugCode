class Wire {
    constructor(startComponent, startTerminal, endComponent, endTerminal) {
        this.id = `wire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.startComponent = startComponent;
        this.startTerminal = startTerminal;
        this.endComponent = endComponent;
        this.endTerminal = endTerminal;

        // Электрические свойства
        this.resistance = 0.01; // Ω/m (упрощенно)
        this.inductance = 0.000001; // 1μH/m
        this.capacitance = 0.0000000001; // 100pF/m
        this.maxCurrent = 5; // A

        // Текущие значения
        this.voltage = 0;
        this.voltageAC = 0;
        this.current = 0;
        this.currentAC = 0;
        this.powerLoss = 0;
        this.temperature = 20;

        // Визуальные свойства
        this.color = '#3498db';
        this.thickness = 2;
        this.isSelected = false;
        this.overheat = false;

        // Подключаем терминалы
        this.connect();
    }

    update(deltaTime) {
        // Обновляем напряжения на основе компонентов
        this.updateVoltages();

        // УЛУЧШЕННЫЙ расчет тока
        this.calculateCurrent();

        // Рассчитываем потери мощности
        this.powerLoss = Math.pow(this.current, 2) * this.resistance * this.getLength();

        // Нагрев провода
        this.temperature = 20 + this.powerLoss * 10;
        this.overheat = this.temperature > 70 || this.current > this.maxCurrent;

        // Изменение сопротивления с температурой
        if (this.temperature > 20) {
            const tempCoefficient = 0.00393; // Медь
            this.resistance = 0.01 * (1 + tempCoefficient * (this.temperature - 20));
        }

        // Обновляем анимационный таймер
        this.animationTimer += deltaTime;
    }


    connect() {
        if (this.startComponent && this.startTerminal) {
            this.startComponent.connectTerminal(this.startTerminal.id, this);
            this.startTerminal.connected = true;
        }

        if (this.endComponent && this.endTerminal) {
            this.endComponent.connectTerminal(this.endTerminal.id, this);
            this.endTerminal.connected = true;
        }

        // Устанавливаем начальные напряжения
        this.updateVoltages();
    }

    disconnect() {
        if (this.startComponent && this.startTerminal) {
            this.startComponent.disconnectTerminal(this.startTerminal.id);
            this.startTerminal.connected = false;
        }

        if (this.endComponent && this.endTerminal) {
            this.endComponent.disconnectTerminal(this.endTerminal.id);
            this.endTerminal.connected = false;
        }
    }

    isConnectedTo(component) {
        return this.startComponent === component || this.endComponent === component;
    }

    updateVoltages() {
        if (this.startTerminal && this.endTerminal) {
            // DC напряжение
            const startVoltage = this.startTerminal.voltage || 0;
            const endVoltage = this.endTerminal.voltage || 0;
            this.voltage = Math.abs(startVoltage - endVoltage);

            // AC напряжение
            const startVoltageAC = this.startTerminal.voltageAC || 0;
            const endVoltageAC = this.endTerminal.voltageAC || 0;
            this.voltageAC = Math.abs(startVoltageAC - endVoltageAC);
        }
    }

    calculateCurrent() {
        // ПЕРВЫЙ СПОСОБ: используем ток из подключенных компонентов
        if (this.startComponent && this.endComponent) {
            // Берем средний ток из двух подключенных компонентов
            const startCurrent = this.startComponent.current || 0;
            const endCurrent = this.endComponent.current || 0;

            if (startCurrent > 0 && endCurrent > 0) {
                this.current = (startCurrent + endCurrent) / 2;
            } else if (startCurrent > 0) {
                this.current = startCurrent;
            } else if (endCurrent > 0) {
                this.current = endCurrent;
            } else {
                // Если ни один компонент не показывает ток, рассчитываем по напряжению
                this.calculateCurrentFromVoltage();
            }
        } else {
            // Если нет компонентов, рассчитываем по напряжению
            this.calculateCurrentFromVoltage();
        }

        // Ограничиваем максимальный ток
        if (this.current > this.maxCurrent) {
            this.current = this.maxCurrent;
            this.overheat = true;
        }
    }

    calculateCurrentFromVoltage() {
        // Расчет тока на основе напряжения и сопротивления
        const effectiveVoltage = Math.max(this.voltage, this.voltageAC);

        // Импеданс провода
        let impedance = this.resistance * this.getLength();

        if (impedance > 0) {
            this.current = effectiveVoltage / impedance;
        } else {
            this.current = 0;
        }
    }


    getOtherComponent(component) {
        if (this.startComponent === component) {
            return this.endComponent;
        } else if (this.endComponent === component) {
            return this.startComponent;
        }
        return null;
    }

    isPointNear(x, y, tolerance = 8) {
        const startX = this.startTerminal ? this.startTerminal.x : 0;
        const startY = this.startTerminal ? this.startTerminal.y : 0;
        const endX = this.endTerminal ? this.endTerminal.x : 0;
        const endY = this.endTerminal ? this.endTerminal.y : 0;

        return this.pointToLineDistance(x, y, startX, startY, endX, endY) < tolerance;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculate() {
        // Ток в проводе зависит от подключенных компонентов
        // Упрощенная модель: если оба компонента активны, ток течет
        if (this.startComponent && this.endComponent) {
            const startVoltage = this.startComponent.voltage || 0;
            const endVoltage = this.endComponent.voltage || 0;

            this.voltage = Math.abs(startVoltage - endVoltage);
            this.current = this.voltage / this.resistance;

            // Если ток слишком большой - провод нагревается
            if (this.current > 1) { // 1А - слишком много для тонкого провода
                this.overheat = true;
            }
        }
    }

    draw(ctx) {
        if (!this.startTerminal || !this.endTerminal) return;

        const startX = this.startTerminal.x;
        const startY = this.startTerminal.y;
        const endX = this.endTerminal.x;
        const endY = this.endTerminal.y;

        // Рисуем провод с изгибом для красоты
        ctx.beginPath();
        ctx.moveTo(startX, startY);

        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) {
            // Кривая Безье для длинных проводов
            const cp1x = startX + dx * 0.5;
            const cp1y = startY - dy * 0.3;
            const cp2x = startX + dx * 0.5;
            const cp2y = startY + dy * 1.3;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        } else {
            // Прямая линия для коротких
            ctx.lineTo(endX, endY);
        }

        // Цвет провода
        let wireColor;
        if (this.isSelected) {
            wireColor = '#00ffff'; // Циан для выделения
        } else if (this.current > 0) {
            // Градиент от синего к желтому в зависимости от тока
            const intensity = Math.min(this.current * 100, 255);
            wireColor = `rgb(${Math.min(100 + intensity, 255)}, ${Math.min(200 - intensity, 255)}, 255)`;
        } else if (this.overheat) {
            wireColor = '#ff0000';
        } else {
            wireColor = this.color;
        }

        ctx.strokeStyle = wireColor;
        ctx.lineWidth = this.isSelected ? this.thickness + 2 : this.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Свечение для активного провода
        if (this.current > 0 && !this.overheat) {
            ctx.strokeStyle = '#ffff00';
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = this.thickness * 1.5;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // УЛУЧШЕННАЯ АНИМАЦИЯ ТОКА
        if (this.current > 0.001) { // Более чувствительный порог
            const segments = Math.max(1, Math.floor(distance / 40));

            // Анимация движения стрелочек
            const animationSpeed = Math.min(this.current * 10, 5);
            const animationOffset = (this.animationTimer * animationSpeed) % 1;

            for (let i = 1; i <= segments; i++) {
                const segmentPos = (i / (segments + 1) + animationOffset) % 1;
                const x = startX + dx * segmentPos;
                const y = startY + dy * segmentPos;

                this.drawCurrentArrow(ctx, x, y, dx, dy, this.current);
            }
        }
    }

    drawCurrentArrow(ctx, x, y, dx, dy, current) {
        const angle = Math.atan2(dy, dx);
        const arrowSize = Math.min(12, Math.max(6, current * 8));
        const pulse = 0.5 + 0.5 * Math.sin(this.animationTimer * 5); // Пульсация

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Тело стрелки
        ctx.fillStyle = `rgba(255, 255, 0, ${0.7 + 0.3 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize/2);
        ctx.lineTo(-arrowSize, arrowSize/2);
        ctx.closePath();
        ctx.fill();

        // Обводка стрелки
        ctx.strokeStyle = '#ff9900';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    getProperties() {
        return {
            'ID': this.id.substring(0, 8),
            'Длина': `${this.getLength().toFixed(1)}px`,
            'Сопротивление': `${this.resistance.toFixed(3)}Ω`,
            'Ток': `${(this.current * 1000).toFixed(1)}mA`,
            'Падение напряжения': `${this.voltage.toFixed(3)}V`,
            'Мощность': `${(this.current * this.voltage).toFixed(3)}W`,
            'От': `${this.startComponent?.name || '?'}:${this.startTerminal?.name || '?'}`,
            'До': `${this.endComponent?.name || '?'}:${this.endTerminal?.name || '?'}`,
            'Состояние': this.overheat ? '🔴 Перегрев!' : (this.current > 0 ? '🟢 Ток течет' : '⚫ Нет тока'),
            'Цвет': this.color
        };
    }

    // Обновление позиции терминала
    updateTerminalPosition(terminal) {
        // Обновляем координаты в проводе
        // Провод будет использовать обновленные координаты при отрисовке
        console.log(`Обновление позиции терминала ${terminal.name} в проводе`);
    }

    getLength() {
        if (!this.startTerminal || !this.endTerminal) return 0;
        const dx = this.startTerminal.x - this.endTerminal.x;
        const dy = this.startTerminal.y - this.endTerminal.y;
        return Math.sqrt(dx * dx + dy * dy) * 0.01; // В метрах (упрощенно)
    }

    // Добавим метод для PropertyPanel
    getEditableProperties() {
        return {
            color: {
                type: 'color',
                label: 'Цвет провода',
                value: this.color,
                onChange: (value) => {
                    this.color = value;
                }
            },
            thickness: {
                type: 'range',
                label: 'Толщина',
                min: 1,
                max: 10,
                step: 0.5,
                value: this.thickness,
                unit: 'px',
                onChange: (value) => {
                    this.thickness = parseFloat(value);
                }
            }
        };
    }

}