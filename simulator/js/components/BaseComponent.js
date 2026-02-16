// Базовый класс для всех компонентов симулятора
// Отвечает за общую логику работы компонентов: позиционирование, вращение, основные электрические свойства
class BaseComponent {
    constructor(type, config = {}) {
        this.id = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = type;
        this.name = config.name || type;
        this.x = config.x || 100;
        this.y = config.y || 100;
        this.width = config.width || 60;
        this.height = config.height || 60;
        this.rotation = config.rotation || 0; // градусы (0, 90, 180, 270)
        this.color = config.color || '#3498db';
        this.selected = false;

        // Электрические свойства
        this.voltage = 0;          // DC напряжение
        this.voltageAC = 0;        // AC амплитуда
        this.current = 0;
        this.currentAC = 0;
        this.resistance = config.resistance || 100;
        this.impedance = config.impedance || this.resistance; // Для AC
        this.power = 0;
        this.frequency = config.frequency || 0; // 0 для DC
        this.phase = 0; // Фаза в радианах

        // Поля для соединений
        this.terminals = [];
        this.connections = [];
        this.terminalVoltages = new Map(); // Напряжения на каждом терминале
        this.terminalCurrents = new Map(); // Токи через каждый терминал

        // Состояние
        this.active = false;
        this.overheat = false;
        this.broken = false;
        this.isAC = config.isAC || false;

        // Для вращения - сохраняем относительные позиции терминалов
        this.terminalRelativePositions = new Map();

        // Временные переменные для AC
        this.time = 0;
        this.omega = 0; // Угловая частота

        // Для последовательных/параллельных соединений
        this.seriesComponents = []; // Компоненты в последовательном соединении
        this.parallelComponents = []; // Компоненты в параллельном соединении
        this.node = null; // Узел для метода узловых потенциалов
    }

    // Добавление терминала/пина
    // Добавление терминала с относительными координатами
    addTerminal(name, type, relativeX, relativeY) {
        // Сохраняем относительные координаты относительно центра компонента
        const relX = relativeX - this.width / 2;
        const relY = relativeY - this.height / 2;

        const terminal = {
            id: `term_${this.id}_${name}`,
            name,
            type,
            x: 0, // Будет вычислено
            y: 0, // Будет вычислено
            connected: false,
            wire: null,
            relativeX: relX, // Относительно центра
            relativeY: relY,
            voltage: 0,
            voltageAC: 0,
            current: 0,
            phase: 0,
            impedance: type === 'ground' ? 0 : Infinity
        };

        this.terminals.push(terminal);
        this.updateTerminalPositions();
    }

    // Вращение компонента
    rotate(angle = 90) {
        this.rotation = (this.rotation + angle) % 360;
        console.log(`${this.name} повернут на ${angle}°. Новый угол: ${this.rotation}°`);
        this.updateTerminalPositions();

        // Обновляем подключенные провода
        this.terminals.forEach(terminal => {
            if (terminal.wire) {
                terminal.wire.updateTerminalPosition(terminal);
            }
        });

        // Обновляем симулятор
        if (window.simulator) {
            window.simulator.updateConnectedWires(this);
        }
    }

    // Обновление состояния (вызывается каждый кадр)
    update(deltaTime) {
        this.time += deltaTime;

        if (this.isAC && this.frequency > 0) {
            this.omega = 2 * Math.PI * this.frequency;
            this.phase = this.omega * this.time;
        }

        // Обновляем состояние на основе напряжений на терминалах
        this.updateFromTerminalVoltages();

        // Обновляем токи
        this.calculateCurrents();

        // Обновляем мощности
        this.calculatePower();

        // Проверяем на перегрев
        this.checkOverheat();
    }

    // Обновление на основе напряжений на терминалах
    updateFromTerminalVoltages() {
        if (this.terminals.length >= 2) {
            const terminal1 = this.terminals[0];
            const terminal2 = this.terminals[1];

            if (this.isAC) {
                // Для AC используем среднеквадратичное значение
                this.voltageAC = Math.sqrt(
                    Math.pow(terminal1.voltageAC || 0, 2) +
                    Math.pow(terminal2.voltageAC || 0, 2)
                ) / Math.sqrt(2);
                this.voltage = this.voltageAC;
            } else {
                this.voltage = Math.abs(
                    (terminal1.voltage || 0) - (terminal2.voltage || 0)
                );
            }

            this.active = this.voltage > 0.1;
        }
    }

    // Расчет электрических параметров
    calculateCurrents() {
        if (this.resistance > 0 && this.voltage > 0) {
            if (this.isAC) {
                // Для AC учитываем импеданс и фазу
                const impedance = this.getImpedance();
                this.currentAC = this.voltageAC / impedance;
                this.current = this.currentAC / Math.sqrt(2); // Действующее значение
            } else {
                this.current = this.voltage / this.resistance;
            }
        } else {
            this.current = 0;
            this.currentAC = 0;
        }
    }

    // Расчет мощности
    calculatePower() {
        if (this.isAC) {
            // Для AC: P = V_rms * I_rms * cos(φ)
            // Пока считаем cos(φ) = 1 для резистивных нагрузок
            this.power = this.voltage * this.current;
        } else {
            this.power = this.voltage * this.current;
        }
    }

    // Получение импеданса (сопротивления для AC)
    getImpedance() {
        if (this.isAC) {
            return this.impedance || this.resistance;
        }
        return this.resistance;
    }

    // Проверка на перегрев
    checkOverheat() {
        const maxPower = this.getMaxPower();
        if (this.power > maxPower) {
            this.overheat = true;
        } else {
            this.overheat = false;
        }
    }

    // Получение максимальной мощности
    getMaxPower() {
        return 0.25; // 250mW по умолчанию
    }

    // Проверка на короткое замыкание
    checkShortCircuit() {
        return this.current > this.getMaxCurrent();
    }

    // Получение максимального тока
    getMaxCurrent() {
        return 0.02; // 20mA по умолчанию
    }

    // Сброс состояния
    reset() {
        this.voltage = 0;
        this.current = 0;
        this.power = 0;
        this.overheat = false;
        this.active = false;
        this.terminals.forEach(terminal => {
            terminal.voltage = 0;
            terminal.voltageAC = 0;
        });
    }

    // Проверка точки внутри компонента с учетом вращения
    isPointInside(x, y) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const angleRad = (-this.rotation * Math.PI) / 180; // Обратное вращение

        // Переносим точку в систему координат компонента
        const dx = x - centerX;
        const dy = y - centerY;

        // Поворачиваем точку обратно
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        const rotatedX = dx * cosA - dy * sinA;
        const rotatedY = dx * sinA + dy * cosA;

        // Проверяем в неротированной системе координат
        const left = -this.width / 2;
        const right = this.width / 2;
        const top = -this.height / 2;
        const bottom = this.height / 2;

        return rotatedX >= left && rotatedX <= right &&
               rotatedY >= top && rotatedY <= bottom;
    }

    // Получение терминала по координатам
    getTerminalAt(x, y, tolerance = 10) {
        return this.terminals.find(terminal => {
            const distance = Math.sqrt(
                Math.pow(x - terminal.x, 2) + Math.pow(y - terminal.y, 2)
            );
            return distance < tolerance;
        });
    }

    // Подключение терминала
    connectTerminal(terminalId, wire) {
        const terminal = this.terminals.find(t => t.id === terminalId);
        if (terminal) {
            terminal.connected = true;
            terminal.wire = wire;
            this.connections.push(wire);
        }
    }

    // Отключение терминала
    disconnectTerminal(terminalId) {
        const terminal = this.terminals.find(t => t.id === terminalId);
        if (terminal) {
            terminal.connected = false;
            terminal.wire = null;
            this.connections = this.connections.filter(w => w.id !== terminal.wire?.id);
        }
    }

    // Методы для работы с последовательными/параллельными соединениями
    connectInSeries(component) {
        if (!this.seriesComponents.includes(component)) {
            this.seriesComponents.push(component);
            console.log(`${this.name} соединен последовательно с ${component.name}`);
        }
    }

    connectInParallel(component) {
        if (!this.parallelComponents.includes(component)) {
            this.parallelComponents.push(component);
            console.log(`${this.name} соединен параллельно с ${component.name}`);
        }
    }

    // Расчет эквивалентного сопротивления для последовательного соединения
    getSeriesResistance() {
        let totalResistance = this.resistance;
        this.seriesComponents.forEach(comp => {
            totalResistance += comp.resistance || 0;
        });
        return totalResistance;
    }

    // Расчет эквивалентного сопротивления для параллельного соединения
    getParallelResistance() {
        let totalConductance = 1 / (this.resistance || Infinity);
        this.parallelComponents.forEach(comp => {
            if (comp.resistance > 0) {
                totalConductance += 1 / comp.resistance;
            }
        });
        return totalConductance > 0 ? 1 / totalConductance : Infinity;
    }

    // Метод для получения напряжения на терминале (учитывая AC/DC)
    getTerminalVoltage(terminalName, time = null) {
        const terminal = this.terminals.find(t => t.name === terminalName);
        if (!terminal) return 0;

        if (this.isAC && this.frequency > 0) {
            const t = time !== null ? time : this.time;
            const phaseShift = this.getPhaseShift(terminalName);
            return terminal.voltageAC * Math.sin(this.omega * t + phaseShift);
        } else {
            return terminal.voltage || 0;
        }
    }

    // Фазовый сдвиг для терминала
    getPhaseShift(terminalName) {
        return 0;
    }

    // Установка напряжения на терминале
    setTerminalVoltage(terminalName, voltage, isAC = false) {
        const terminal = this.terminals.find(t => t.name === terminalName);
        if (terminal) {
            if (isAC) {
                terminal.voltageAC = voltage;
            } else {
                terminal.voltage = voltage;
            }
        }
    }

    // Проверить, есть ли питание на компоненте
    hasPower() {
        if (this.terminals.length >= 2) {
            const voltage = this.getVoltageBetweenTerminals(this.terminals[0].name, this.terminals[1].name);
            return voltage > 0.1; // Порог 0.1V
        }
        return false;
    }

    getVoltageBetweenTerminals(terminal1Name, terminal2Name) {
        const terminal1 = this.terminals.find(t => t.name === terminal1Name);
        const terminal2 = this.terminals.find(t => t.name === terminal2Name);

        if (!terminal1 || !terminal2) return 0;

        return Math.abs(terminal1.voltage - terminal2.voltage);
    }

    // Обновление позиций терминалов с учетом вращения
    updateTerminalPositions() {
        try {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            const angleRad = (this.rotation * Math.PI) / 180;

            this.terminals.forEach(terminal => {
                if (terminal.relativeX === undefined || terminal.relativeY === undefined) {
                    // Если относительные координаты не заданы, вычисляем их
                    terminal.relativeX = terminal.x - centerX;
                    terminal.relativeY = terminal.y - centerY;
                }

                // Поворачиваем координаты
                const cosA = Math.cos(angleRad);
                const sinA = Math.sin(angleRad);
                const rotatedX = terminal.relativeX * cosA - terminal.relativeY * sinA;
                const rotatedY = terminal.relativeX * sinA + terminal.relativeY * cosA;

                // Устанавливаем новые абсолютные координаты
                terminal.x = centerX + rotatedX;
                terminal.y = centerY + rotatedY;
            });
        } catch (error) {
            console.error('Error updating terminal positions:', error);
        }
    }

    // Получение свойств для панели
    getProperties() {
        const state = this.broken ? '🔴 Сломан' :
                     this.overheat ? '🟡 Перегрев' :
                     this.active ? '🟢 Активен' : '⚫ Неактивен';

        return {
            'Тип': this.type,
            'Название': this.name,
            'Положение': `(${Math.round(this.x)}, ${Math.round(this.y)})`,
            'Размер': `${this.width} × ${this.height}`,
            'Напряжение': `${this.voltage.toFixed(3)}V${this.isAC ? ' (RMS)' : ''}`,
            'Ток': `${(this.current * 1000).toFixed(1)}mA${this.isAC ? ' (RMS)' : ''}`,
            'Мощность': `${this.power.toFixed(3)}W`,
            'Сопротивление': this.resistance ? `${this.resistance}Ω` : 'Н/Д',
            'Импеданс': this.isAC ? `${this.getImpedance().toFixed(1)}Ω` : 'N/A',
            'Частота': this.isAC ? `${this.frequency}Hz` : 'DC',
            'Состояние': state
        };
    }

    // Базовый метод для редактируемых свойств (компоненты могут переопределить)
    getEditableProperties() {
        return {
            name: {
                type: 'text',
                label: 'Название',
                value: this.name,
                onChange: (value) => {
                    this.name = value;
                }
            },
            color: {
                type: 'color',
                label: 'Цвет',
                value: this.color,
                onChange: (value) => {
                    this.color = value;
                }
            }
        };
    }

    // Базовая отрисовка компонента с вращением
    draw(ctx) {
        this.updateTerminalPositions();

        ctx.save();

        // Перемещаем в центр компонента
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Основной цвет
        ctx.fillStyle = this.overheat ? '#ff4444' : this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // Граница
        ctx.strokeStyle = this.selected ? '#00ffff' : '#000000';
        ctx.lineWidth = this.selected ? 3 : 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);

        // Название компонента
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name, 0, 25);

        // Индикатор AC/DC
        if (this.isAC) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px Arial';
            ctx.fillText('AC', 0, -25);
            if (this.frequency > 0) {
                ctx.fillText(`${this.frequency}Hz`, 0, 40);
            }
        }

        ctx.restore();

        // Рисуем терминалы
        this.drawTerminals(ctx);
    }

    // Отрисовка терминалов
    drawTerminals(ctx) {
        this.terminals.forEach(terminal => {
            ctx.fillStyle = terminal.connected ? '#00ff00' : '#666666';
            ctx.beginPath();
            ctx.arc(terminal.x, terminal.y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Подпись терминала
            if (this.selected) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '6px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(terminal.name, terminal.x, terminal.y);

                // Показываем напряжение на терминале
                const voltage = terminal.voltage || 0;
                if (Math.abs(voltage) > 0.01) {
                    ctx.fillStyle = '#ffff00';
                    ctx.font = '8px Arial';
                    ctx.fillText(`${voltage.toFixed(1)}V`, terminal.x, terminal.y - 10);
                }
            }
        });
    }

    // Отрисовка выделения
    drawSelection(ctx) {
        ctx.save();
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((this.rotation * Math.PI) / 180);

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(-this.width/2 - 5, -this.height/2 - 5,
                      this.width + 10, this.height + 10);
        ctx.setLineDash([]);

        // Индикатор вращения (маленький уголок)
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.moveTo(this.width/2, -this.height/2);
        ctx.lineTo(this.width/2 + 10, -this.height/2);
        ctx.lineTo(this.width/2, -this.height/2 + 10);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // Обновление при перемещении
    setPosition(x, y) {
        const oldX = this.x;
        const oldY = this.y;

        this.x = x;
        this.y = y;

        // Обновляем позиции терминалов
        this.updateTerminalPositions();

        // Обновляем подключенные провода
        this.terminals.forEach(terminal => {
            if (terminal.wire) {
                terminal.wire.updateTerminalPosition(terminal);
            }
        });
    }
}