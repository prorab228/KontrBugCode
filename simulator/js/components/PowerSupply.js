class PowerSupply extends VoltageSource {
    constructor(config = {}) {
        super('powersupply', {
            color: '#0055aa',
            width: 80,
            height: 50,
            isAC: config.isAC || false,
            frequency: config.frequency || 50,
            ...config
        });

        // Характеристики источника питания
        this.outputVoltage = config.voltage || 12; // Выходное напряжение
        this.maxCurrent = config.maxCurrent || 2; // Максимальный ток (A)
        this.currentLimit = config.currentLimit || this.maxCurrent; // Лимит тока
        this.voltageAccuracy = config.voltageAccuracy || 0.01; // Точность напряжения (±%)
        this.ripple = config.ripple || 0.01; // Пульсации (для DC)

        // Состояние
        this.isEnabled = config.isEnabled !== undefined ? config.isEnabled : true;
        this.overCurrentProtection = config.overCurrentProtection || true;
        this.overVoltageProtection = config.overVoltageProtection || true;
        this.shortCircuitProtection = config.shortCircuitProtection || true;

        // Защитные механизмы
        this.tripped = false; // Сработала ли защита
        this.currentDraw = 0; // Текущий потребляемый ток
        this.outputVoltageActual = this.outputVoltage; // Фактическое выходное напряжение

        // Для AC источников
        this.waveform = config.waveform || 'sine'; // sine, square, triangle
        this.voltageRMS = this.isAC ? this.outputVoltage : 0; // Действующее значение для AC

        // Терминалы
        this.addTerminal('V+', 'power', 0, this.height/2);
        this.addTerminal('COM', 'ground', this.width, this.height/2);

        // Дополнительные функции
        this.voltageAdjustable = config.voltageAdjustable || true;
        this.currentAdjustable = config.currentAdjustable || true;

        // Анимация
        this.displayTimer = 0;
        this.rippleAnimation = 0;

        // свойства для отслеживания нагрузки
        this.loadCurrent = 0; // Ток нагрузки
        this.loadConnected = false; // Подключена ли нагрузка

        // Инициализация
        this.updateActualVoltage();
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (!this.isEnabled || this.tripped) {
            // Источник выключен или сработала защита
            this.current = 0;
            this.loadCurrent = 0;
            this.power = 0;
            this.outputVoltageActual = 0;
            this.loadConnected = false;
            this.updateTerminalVoltages();
            return;
        }

        // Обновляем анимацию
        this.displayTimer += deltaTime;
        this.rippleAnimation += deltaTime * 10;
        if (this.rippleAnimation > Math.PI * 2) this.rippleAnimation -= Math.PI * 2;

        // Рассчитываем фактическое выходное напряжение с учетом пульсаций
        this.updateActualVoltage();

        // Обновляем напряжения на терминалах
        this.updateTerminalVoltages();

        // РАССЧИТЫВАЕМ ТОК НАГРУЗКИ
        this.calculateLoadCurrent();

        // Проверяем защитные механизмы
        this.checkProtections();

        // Расчет мощности
        this.power = this.loadCurrent * this.outputVoltageActual;

        // Нагрев источника
        const efficiency = 0.85; // КПД 85%
        const powerLoss = this.power * (1 - efficiency);
        this.temperature = 20 + powerLoss * 10;

        if (this.temperature > 70) {
            this.overheat = true;
            if (this.temperature > 85) {
                // Термическая защита
                this.tripped = true;
                this.isEnabled = false;
            }
        }
    }

    // Метод для расчета тока нагрузки
    calculateLoadCurrent() {
        const positiveTerminal = this.terminals.find(t => t.name === 'V+');
        const groundTerminal = this.terminals.find(t => t.name === 'COM');

        if (!positiveTerminal || !groundTerminal) {
            this.loadCurrent = 0;
            this.loadConnected = false;
            return;
        }

        // Проверяем подключение нагрузки
        this.loadConnected = positiveTerminal.connected || groundTerminal.connected;

        if (!this.loadConnected) {
            this.loadCurrent = 0;
            return;
        }

        // В реальной симуляции ток должен рассчитываться анализатором цепи
        // Здесь упрощенная модель - ток зависит от напряжения и сопротивления нагрузки
        if (positiveTerminal.connected && groundTerminal.connected) {
            // Если оба терминала подключены, пытаемся определить ток
            // В реальном симуляторе здесь должен быть доступ к подключенным компонентам
            const voltage = this.outputVoltageActual;

            // Упрощенный расчет: предполагаем некоторое сопротивление нагрузки
            // В реальности это должно приходить от CircuitAnalyzer
            if (voltage > 0) {
                // Для демонстрации: 100-1000 Ом нагрузка
                const loadResistance = 220; // Ом
                this.loadCurrent = Math.min(this.currentLimit, voltage / loadResistance);
            } else {
                this.loadCurrent = 0;
            }
        } else {
            this.loadCurrent = 0;
        }

        // Обновляем свойство current для совместимости
        this.current = this.loadCurrent;
    }



    updateActualVoltage() {
        if (this.isAC) {
            // Для AC: синусоидальное напряжение с заданной частотой
            const amplitude = this.outputVoltage * Math.sqrt(2); // Амплитуда для получения RMS
            const timeFactor = this.displayTimer * 2 * Math.PI * this.frequency;

            switch(this.waveform) {
                case 'sine':
                    this.outputVoltageActual = amplitude * Math.sin(timeFactor);
                    break;
                case 'square':
                    this.outputVoltageActual = Math.sin(timeFactor) > 0 ? amplitude : -amplitude;
                    break;
                case 'triangle':
                    const period = 1 / this.frequency;
                    const phase = (this.displayTimer % period) / period;
                    this.outputVoltageActual = amplitude * (2 * Math.abs(2 * phase - 1) - 1);
                    break;
                default:
                    this.outputVoltageActual = amplitude * Math.sin(timeFactor);
            }

            this.voltageRMS = this.outputVoltage;
        } else {
            // Для DC: добавляем пульсации
            const rippleVoltage = this.ripple * this.outputVoltage;
            this.outputVoltageActual = this.outputVoltage +
                rippleVoltage * Math.sin(this.rippleAnimation);

            this.voltageRMS = this.outputVoltageActual;
        }

        // Учитываем точность напряжения
        const accuracyFactor = 1 + (Math.random() * 2 - 1) * this.voltageAccuracy;
        this.outputVoltageActual *= accuracyFactor;
    }

    updateTerminalVoltages() {
        const positiveTerminal = this.terminals.find(t => t.name === 'V+');
        const groundTerminal = this.terminals.find(t => t.name === 'COM');

        if (positiveTerminal && groundTerminal) {
            if (this.isAC) {
                positiveTerminal.voltageAC = Math.abs(this.outputVoltageActual);
                positiveTerminal.voltage = this.outputVoltage; // RMS для отображения
                groundTerminal.voltage = 0;
                groundTerminal.voltageAC = 0;
            } else {
                positiveTerminal.voltage = this.outputVoltageActual;
                groundTerminal.voltage = 0;
            }
        }
    }

    checkProtections() {
        // Проверка перегрузки по току
        if (this.overCurrentProtection && this.current > this.currentLimit) {
            this.tripped = true;
            console.log(`${this.name}: Сработала защита от перегрузки по току!`);
            return;
        }

        // Проверка короткого замыкания
        if (this.shortCircuitProtection && this.current > this.maxCurrent * 3) {
            this.tripped = true;
            console.log(`${this.name}: Сработала защита от короткого замыкания!`);
            return;
        }

        // Проверка перенапряжения (если источник регулируемый)
        if (this.overVoltageProtection && this.voltageAdjustable) {
            const maxVoltage = this.outputVoltage * 1.1; // +10%
            if (this.outputVoltageActual > maxVoltage) {
                this.tripped = true;
                console.log(`${this.name}: Сработала защита от перенапряжения!`);
            }
        }
    }

    // Методы управления
    toggle() {
        if (this.tripped) {
            console.log(`${this.name}: Защита сработала, сначала сбросьте защиту`);
            return;
        }

        this.isEnabled = !this.isEnabled;
        console.log(`${this.name}: ${this.isEnabled ? 'ВКЛ' : 'ВЫКЛ'}`);
    }

    resetProtection() {
        if (this.tripped) {
            this.tripped = false;
            this.isEnabled = true;
            console.log(`${this.name}: Защита сброшена`);
        }
    }

    setVoltage(voltage) {
        if (!this.voltageAdjustable) {
            console.log(`${this.name}: Напряжение не регулируется`);
            return;
        }

        const oldVoltage = this.outputVoltage;
        this.outputVoltage = Math.max(0.1, Math.min(voltage, 30)); // Ограничение 0.1-30V
        console.log(`${this.name}: Напряжение изменено с ${oldVoltage}V на ${this.outputVoltage}V`);
    }

    setCurrentLimit(current) {
        if (!this.currentAdjustable) {
            console.log(`${this.name}: Ток не регулируется`);
            return;
        }

        const oldLimit = this.currentLimit;
        this.currentLimit = Math.max(0.01, Math.min(current, this.maxCurrent));
        console.log(`${this.name}: Лимит тока изменен с ${oldLimit}A на ${this.currentLimit}A`);
    }

    // Методы для AC/DC переключения
    setACMode(isAC) {
        if (this.isAC === isAC) return;

        this.isAC = isAC;
        if (isAC) {
            this.waveform = 'sine';
            this.frequency = 50;
        }

        console.log(`${this.name}: Режим изменен на ${isAC ? 'AC' : 'DC'}`);
    }

    setWaveform(waveform) {
        if (!this.isAC) {
            console.log(`${this.name}: Форма сигнала доступна только в режиме AC`);
            return;
        }

        if (['sine', 'square', 'triangle'].includes(waveform)) {
            this.waveform = waveform;
            console.log(`${this.name}: Форма сигнала изменена на ${waveform}`);
        }
    }

   draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Корпус источника питания
        ctx.fillStyle = this.tripped ? '#ff4444' :
                       this.overheat ? '#ffaa00' : this.color;
        ctx.fillRect(0, 0, this.width, this.height);

        // Панель управления
        ctx.fillStyle = '#333333';
        ctx.fillRect(5, 5, this.width - 10, 15);

        // Дисплей
        ctx.fillStyle = this.isEnabled ? '#00ff00' : '#ff0000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Отображение напряжения и тока - ИСПРАВЛЕНО
        const voltageText = `${this.outputVoltage.toFixed(1)}V`;
        const currentText = `${(this.loadCurrent * 1000).toFixed(0)}mA`;

        ctx.fillText(voltageText, this.width/2, 12);

        ctx.fillStyle = '#ffff00';
        ctx.fillText(currentText, this.width/2, this.height - 10);

        // Индикаторы
        ctx.fillStyle = this.isEnabled ? '#00ff00' : '#333333';
        ctx.beginPath();
        ctx.arc(10, this.height - 10, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.tripped ? '#ff0000' : '#333333';
        ctx.beginPath();
        ctx.arc(this.width - 10, this.height - 10, 3, 0, Math.PI * 2);
        ctx.fill();

        // Символ AC/DC
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(this.isAC ? 'AC' : 'DC', this.width/2, this.height/2);

        // Форма сигнала (для AC)
        if (this.isAC && this.isEnabled) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.beginPath();

            const amplitude = 8;
            const samples = 20;

            for (let i = 0; i < samples; i++) {
                const x = 10 + (i / (samples - 1)) * (this.width - 20);
                const t = (i / (samples - 1)) * 2 * Math.PI + this.displayTimer * 5;

                let y;
                switch(this.waveform) {
                    case 'sine':
                        y = this.height/2 + amplitude * Math.sin(t);
                        break;
                    case 'square':
                        y = this.height/2 + amplitude * (Math.sin(t) > 0 ? 1 : -1);
                        break;
                    case 'triangle':
                        const phase = (t % (2 * Math.PI)) / (2 * Math.PI);
                        y = this.height/2 + amplitude * (2 * Math.abs(2 * phase - 1) - 1);
                        break;
                    default:
                        y = this.height/2 + amplitude * Math.sin(t);
                }

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Пульсации (для DC)
        if (!this.isAC && this.isEnabled && this.ripple > 0.001) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();

            const rippleAmplitude = this.ripple * 10;
            for (let i = 0; i < 10; i++) {
                const x = 10 + (i / 9) * (this.width - 20);
                const y = this.height/2 + rippleAmplitude * Math.sin(this.rippleAnimation + i * 0.5);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Клеммы
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(0, this.height/2 - 4, 6, 8);
        ctx.fillRect(this.width - 6, this.height/2 - 4, 6, 8);

        // Обозначения клемм
        ctx.fillStyle = '#000000';
        ctx.font = '9px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('+', 8, this.height/2 + 3);
        ctx.textAlign = 'right';
        ctx.fillText('COM', this.width - 8, this.height/2 + 3);

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Выходное напряжение': `${this.outputVoltage.toFixed(2)}V${this.isAC ? ' (RMS)' : ''}`,
            'Фактическое напряжение': `${this.outputVoltageActual.toFixed(2)}V`,
            'Максимальный ток': `${this.maxCurrent}A`,
            'Лимит тока': `${this.currentLimit.toFixed(2)}A`,
            'Ток нагрузки': `${(this.loadCurrent * 1000).toFixed(0)}mA`,
            'Нагрузка подключена': this.loadConnected ? 'Да' : 'Нет',
            'Пульсации': `${(this.ripple * 100).toFixed(1)}%`,
            'Точность': `±${(this.voltageAccuracy * 100).toFixed(1)}%`,
            'Режим': this.isAC ? 'Переменный ток (AC)' : 'Постоянный ток (DC)',
            'Форма сигнала': this.isAC ? this.waveform : 'N/A',
            'Частота': this.isAC ? `${this.frequency}Hz` : 'N/A',
            'Состояние': this.tripped ? '🔴 Защита сработала' :
                       !this.isEnabled ? '🔴 Выключен' :
                       this.overheat ? '🟡 Перегрев' : '🟢 Включен'
        };
    }

    getEditableProperties() {
        return {
            voltage: {
                type: 'range',
                label: 'Выходное напряжение',
                min: 0.1,
                max: this.isAC ? 240 : 30,
                step: 0.1,
                value: this.outputVoltage,
                unit: 'V',
                onChange: (value) => this.setVoltage(parseFloat(value))
            },
            currentLimit: {
                type: 'range',
                label: 'Лимит тока',
                min: 0.01,
                max: this.maxCurrent,
                step: 0.01,
                value: this.currentLimit,
                unit: 'A',
                onChange: (value) => this.setCurrentLimit(parseFloat(value))
            },
            isAC: {
                type: 'checkbox',
                label: 'Режим AC',
                value: this.isAC,
                onChange: (value) => this.setACMode(value)
            },
            waveform: {
                type: 'select',
                label: 'Форма сигнала',
                options: [
                    { value: 'sine', label: 'Синусоида' },
                    { value: 'square', label: 'Прямоугольная' },
                    { value: 'triangle', label: 'Треугольная' }
                ],
                value: this.waveform,
                onChange: (value) => this.setWaveform(value)
            },
            frequency: {
                type: 'range',
                label: 'Частота',
                min: 1,
                max: 1000,
                step: 1,
                value: this.frequency,
                unit: 'Hz',
                onChange: (value) => {
                    this.frequency = parseInt(value);
                }
            }
        };
    }
}