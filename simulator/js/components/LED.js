class LED extends BaseComponent {
    constructor(config = {}) {
        super('led', {
            color: config.color || '#ff0000',
            width: 40,
            height: 40,
            resistance: config.resistance || 220,
            ...config
        });

        // Основные характеристики
        this.forwardVoltage = config.forwardVoltage || 2.0; // Падение напряжения
        this.maxCurrent = config.maxCurrent || 0.02; // Максимальный ток (20mA)
        this.efficiency = config.efficiency || 0.3; // Световая эффективность

        // Цвет светодиода
        this.ledColor = config.color || '#ff0000'; // Цвет свечения

        // Состояние
        this.isLit = false;
        this.brightness = 0; // Яркость 0-1
        this.luminousFlux = 0; // Световой поток

        // Терминалы
        this.addTerminal('A', 'power', 0, this.height/2);  // Анод
        this.addTerminal('C', 'ground', this.width, this.height/2); // Катод

        // Анимация
        this.glowIntensity = 0;
        this.flickerTimer = 0;
        this.temperature = 20;
        this.animationPhase = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);

        this.animationPhase += deltaTime * 5;
        if (this.animationPhase > Math.PI * 2) this.animationPhase -= Math.PI * 2;

        this.updateLED(deltaTime);

        // Обновляем яркость для анимации
        if (this.isLit) {
            this.flickerTimer += deltaTime * 10;
            const flicker = Math.sin(this.flickerTimer) * 0.05 + 0.95;
            this.glowIntensity = this.brightness * flicker;

            // Нагрев
            this.temperature = 20 + this.power * 50;
            if (this.temperature > 80) {
                this.overheat = true;
                this.efficiency = Math.max(0.1, 0.3 - (this.temperature - 80) * 0.01);
            }
        } else {
            this.glowIntensity = Math.max(this.glowIntensity - deltaTime * 2, 0);
            this.temperature = Math.max(20, this.temperature - deltaTime * 10);
        }

        // Проверка на превышение максимального тока
        if (this.current > this.maxCurrent * 1.1) {
            this.overheat = true;
            if (this.current > this.maxCurrent * 2) {
                this.broken = true;
                this.isLit = false;
                this.resistance = 0.01; // Короткое замыкание
            }
        }
    }

    updateLED(deltaTime) {
        const anode = this.terminals.find(t => t.name === 'A');
        const cathode = this.terminals.find(t => t.name === 'C');

        if (!anode || !cathode) return;

        // Проверяем, подключены ли оба терминала
        if (!anode.connected || !cathode.connected) {
            // Цепь не замкнута
            this.isLit = false;
            this.brightness = 0;
            this.current = 0;
            this.power = 0;
            this.luminousFlux = 0;
            this.voltage = 0;
            return;
        }

        // Напряжение между анодом и катодом
        const voltageDiff = (anode.voltage || 0) - (cathode.voltage || 0);

        // Проверяем полярность и достаточность напряжения
        if (voltageDiff >= this.forwardVoltage) {
            // Прямое смещение и достаточное напряжение
            const excessVoltage = voltageDiff - this.forwardVoltage;

            // Расчет тока через закон Ома с учетом сопротивления LED
            this.current = Math.min(this.maxCurrent, excessVoltage / this.resistance);

            // Расчет мощности
            this.power = this.current * voltageDiff;

            // Яркость пропорциональна току
            this.brightness = Math.min(1, this.current / this.maxCurrent);

            // Световой поток
            this.luminousFlux = this.power * this.efficiency * 100;

            this.isLit = true;
            this.voltage = voltageDiff;

        } else if (voltageDiff <= -this.forwardVoltage) {
            // Обратное смещение - LED не светится, но может быть небольшой ток утечки
            this.current = 0.000001; // 1μA утечки
            this.power = Math.abs(this.current * voltageDiff);
            this.isLit = false;
            this.brightness = 0;
            this.voltage = voltageDiff;
        } else {
            // Недостаточное напряжение в любом направлении
            this.isLit = false;
            this.brightness = 0;
            this.current = 0;
            this.power = 0;
            this.luminousFlux = 0;
            this.voltage = voltageDiff;
        }
    }

    // Метод для изменения цвета
    setColor(color) {
        this.ledColor = color;
        console.log(`LED ${this.name}: цвет изменен на ${color}`);
    }

    draw(ctx) {
        this.updateTerminalPositions();

        ctx.save();
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;

        ctx.translate(centerX, centerY);
        ctx.rotate((this.rotation * Math.PI) / 180);

        console.log('Draw Led isLit',this.isLit, this.forwardVoltage);
        // Свечение (рисуется ПОД корпусом)
        if (this.isLit && this.glowIntensity > 0) {
           // alert('СВЕЕТ');
            // Внутреннее свечение
            const innerGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);

            // Парсим цвет для градиента
            const color = this.parseColor(this.ledColor);

            innerGlow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.glowIntensity * 0.8})`);
            innerGlow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fill();

            // Внешнее свечение (более рассеянное)
            const outerGlow = ctx.createRadialGradient(0, 0, 15, 0, 0, 50 + this.glowIntensity * 30);
            outerGlow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.glowIntensity * 0.3})`);
            outerGlow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 50 + this.glowIntensity * 30, 0, Math.PI * 2);
            ctx.fill();
        }

        // Корпус светодиода
        ctx.fillStyle = this.overheat ? '#ff4444' : '#cccccc';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Граница корпуса
        ctx.strokeStyle = this.selected ? '#00ffff' : '#000000';
        ctx.lineWidth = this.selected ? 3 : 1;
        ctx.stroke();

        // Линза/кристалл светодиода
        if (this.isLit) {
            // Градиент для линзы
            const lensGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
            const color = this.parseColor(this.ledColor);
            lensGradient.addColorStop(0, `rgb(${color.r}, ${color.g}, ${color.b})`);
            lensGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`);
            ctx.fillStyle = lensGradient;
        } else {
            ctx.fillStyle = '#666666';
        }
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Отражение на линзе (эффект объема)
        if (this.isLit) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(-2, -2, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Катодная метка (плоская сторона)
        ctx.fillStyle = '#000000';
        ctx.fillRect(10, -3, 4, 6);

        // Выводы
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-15, 0);
        ctx.moveTo(15, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        // Информация (только если выделен)
        if (this.selected) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';

            if (this.current > 0) {
                ctx.fillText(`${(this.current * 1000).toFixed(0)}mA`, 0, 25);
                ctx.fillText(`${Math.round(this.brightness * 100)}%`, 0, 35);
            }
        }

        ctx.restore();

        // Рисуем терминалы поверх
        this.drawTerminals(ctx);
    }

    getProperties() {
        const baseProps = super.getProperties();
        const properties = {
            ...baseProps,
            'Тип': 'Светодиод',
            'Прямое напряжение': `${this.forwardVoltage}V`,
            'Макс. ток': `${(this.maxCurrent * 1000).toFixed(0)}mA`,
            'Яркость': `${Math.round(this.brightness * 100)}%`,
            'Световой поток': `${this.luminousFlux.toFixed(1)} лм`,
            'Температура': `${this.temperature.toFixed(1)}°C`,
            'Эффективность': `${(this.efficiency * 100).toFixed(1)}%`,
            'Цвет': this.ledColor,
            'Состояние': this.broken ? '🔴 Сгорел' :
                       this.overheat ? '🟡 Перегрев' :
                       this.isLit ? '🟢 Включен' : '⚫ Выключен'
        };

        return properties;
    }

    getEditableProperties() {
        const baseProps = super.getEditableProperties();

        return {
            ...baseProps,
            color: {
                type: 'color',
                label: 'Цвет свечения',
                value: this.ledColor,
                onChange: (value) => {
                    this.setColor(value);
                }
            },
            forwardVoltage: {
                type: 'range',
                label: 'Прямое напряжение',
                min: 1.5,
                max: 3.6,
                step: 0.1,
                value: this.forwardVoltage,
                unit: 'V',
                onChange: (value) => {
                    this.forwardVoltage = parseFloat(value);
                }
            },
            maxCurrent: {
                type: 'range',
                label: 'Максимальный ток',
                min: 1,
                max: 100,
                step: 1,
                value: this.maxCurrent * 1000,
                unit: 'mA',
                onChange: (value) => {
                    this.maxCurrent = parseFloat(value) / 1000;
                }
            }
        };
    }

    // Вспомогательный метод для парсинга цвета
    parseColor(color) {
        if (color.startsWith('rgb(')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3])
                };
            }
        } else if (color.startsWith('#')) {
            const hex = color.substring(1);
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            };
        }
        return { r: 255, g: 0, b: 0 }; // Красный по умолчанию
    }
}