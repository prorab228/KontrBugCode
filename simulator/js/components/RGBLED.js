class RGBLED extends BaseComponent {
    constructor(config = {}) {
        super('rgbled', {
            color: '#ffffff',
            width: 40,
            height: 40,
            resistance: config.resistance || 220,
            ...config
        });

        // Основные характеристики
        this.forwardVoltage = config.forwardVoltage || 2.0; // Падение напряжения
        this.maxCurrent = config.maxCurrent || 0.02; // Максимальный ток (20mA)
        this.efficiency = config.efficiency || 0.3; // Световая эффективность

        // Цветовые компоненты RGB
        this.red = config.red || 255;
        this.green = config.green || 0;
        this.blue = config.blue || 0;
        this.ledColor = `rgb(${this.red}, ${this.green}, ${this.blue})`;

        // Состояние
        this.isLit = false;
        this.brightness = 0; // Яркость 0-1
        this.luminousFlux = 0; // Световой поток

        // Терминалы (4 вывода)
        this.addTerminal('R', 'power', 0, this.height/4);
        this.addTerminal('G', 'power', 0, this.height/2);
        this.addTerminal('B', 'power', 0, 3*this.height/4);
        this.addTerminal('C', 'ground', this.width, this.height/2);

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

        this.updateRGB(deltaTime);

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

    updateRGB(deltaTime) {
        const rTerminal = this.terminals.find(t => t.name === 'R');
        const gTerminal = this.terminals.find(t => t.name === 'G');
        const bTerminal = this.terminals.find(t => t.name === 'B');
        const cathode = this.terminals.find(t => t.name === 'C');

        if (!cathode || !cathode.connected) {
            // Катод не подключен - цепь не замкнута
            this.isLit = false;
            this.brightness = 0;
            this.current = 0;
            this.power = 0;
            this.luminousFlux = 0;
            return;
        }

        let totalCurrent = 0;
        let totalPower = 0;
        let maxBrightness = 0;

        // Проверяем каждый цветовой канал
        const channels = [
            { terminal: rTerminal, color: 'red' },
            { terminal: gTerminal, color: 'green' },
            { terminal: bTerminal, color: 'blue' }
        ];

        channels.forEach(channel => {
            if (!channel.terminal || !channel.terminal.connected) {
                this[channel.color] = 0;
                return;
            }

            const voltageDiff = (channel.terminal.voltage || 0) - (cathode.voltage || 0);

            if (voltageDiff >= this.forwardVoltage) {
                const excessVoltage = voltageDiff - this.forwardVoltage;
                const channelCurrent = Math.min(this.maxCurrent / 3, excessVoltage / this.resistance);
                const channelPower = channelCurrent * voltageDiff;
                const channelBrightness = Math.min(1, channelCurrent / (this.maxCurrent / 3));

                totalCurrent += channelCurrent;
                totalPower += channelPower;
                maxBrightness = Math.max(maxBrightness, channelBrightness);

                // Обновляем цветовую компоненту
                this[channel.color] = Math.min(255, Math.max(0, Math.round(channelBrightness * 255)));
            } else {
                this[channel.color] = 0;
            }
        });

        // Обновляем общее состояние
        this.current = totalCurrent;
        this.power = totalPower;
        this.brightness = maxBrightness;
        this.isLit = totalCurrent > 0;
        this.luminousFlux = this.power * this.efficiency * 100;

        // Обновляем цвет RGB светодиода
        this.ledColor = `rgb(${this.red}, ${this.green}, ${this.blue})`;
    }
    // Метод для изменения цвета
    setColor(color) {
        if (color.startsWith('rgb(')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                this.red = parseInt(match[1]);
                this.green = parseInt(match[2]);
                this.blue = parseInt(match[3]);
                this.ledColor = color;
            }
        } else if (color.startsWith('#')) {
            // HEX цвет
            const hex = color.substring(1);
            this.red = parseInt(hex.substring(0, 2), 16);
            this.green = parseInt(hex.substring(2, 4), 16);
            this.blue = parseInt(hex.substring(4, 6), 16);
            this.ledColor = color;
        }

        console.log(`RGBLED ${this.name}: цвет изменен на ${color}`);
    }

    // Метод для установки цвета по компонентам
    setRGB(red, green, blue) {
        this.red = Math.min(255, Math.max(0, red));
        this.green = Math.min(255, Math.max(0, green));
        this.blue = Math.min(255, Math.max(0, blue));
        this.ledColor = `rgb(${this.red}, ${this.green}, ${this.blue})`;
    }

    // Метод для анимации цветов
    animateRainbow(deltaTime) {
        if (!this.isLit) return;

        this.animationPhase += deltaTime * 2;
        if (this.animationPhase > Math.PI * 2) this.animationPhase -= Math.PI * 2;

        // Плавное изменение цветов по радуге
        this.red = Math.round(127 + 127 * Math.sin(this.animationPhase));
        this.green = Math.round(127 + 127 * Math.sin(this.animationPhase + Math.PI * 2/3));
        this.blue = Math.round(127 + 127 * Math.sin(this.animationPhase + Math.PI * 4/3));

        this.ledColor = `rgb(${this.red}, ${this.green}, ${this.blue})`;
    }

    draw(ctx) {
        this.updateTerminalPositions();

        ctx.save();
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;

        ctx.translate(centerX, centerY);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Свечение (рисуется ПОД корпусом)
        if (this.isLit && this.glowIntensity > 0) {
            // Внутреннее свечение
            const innerGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
            innerGlow.addColorStop(0, `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.glowIntensity * 0.8})`);
            innerGlow.addColorStop(1, `rgba(${this.red}, ${this.green}, ${this.blue}, 0)`);

            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fill();

            // Внешнее свечение (более рассеянное)
            const outerGlow = ctx.createRadialGradient(0, 0, 15, 0, 0, 50 + this.glowIntensity * 30);
            outerGlow.addColorStop(0, `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.glowIntensity * 0.3})`);
            outerGlow.addColorStop(1, `rgba(${this.red}, ${this.green}, ${this.blue}, 0)`);

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
            lensGradient.addColorStop(0, this.ledColor);
            lensGradient.addColorStop(1, `${this.ledColor}66`); // Полупрозрачный
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

        // Цветовые сегменты
        if (this.selected) {
            const segmentSize = 5;

            // Красный сегмент
            ctx.fillStyle = `rgba(255, 0, 0, ${this.red/255})`;
            ctx.beginPath();
            ctx.moveTo(-segmentSize, -segmentSize);
            ctx.lineTo(0, -segmentSize*2);
            ctx.lineTo(segmentSize, -segmentSize);
            ctx.closePath();
            ctx.fill();

            // Зеленый сегмент
            ctx.fillStyle = `rgba(0, 255, 0, ${this.green/255})`;
            ctx.beginPath();
            ctx.moveTo(-segmentSize*2, 0);
            ctx.lineTo(-segmentSize, -segmentSize);
            ctx.lineTo(-segmentSize, segmentSize);
            ctx.closePath();
            ctx.fill();

            // Синий сегмент
            ctx.fillStyle = `rgba(0, 0, 255, ${this.blue/255})`;
            ctx.beginPath();
            ctx.moveTo(segmentSize, -segmentSize);
            ctx.lineTo(segmentSize*2, 0);
            ctx.lineTo(segmentSize, segmentSize);
            ctx.closePath();
            ctx.fill();
        }

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

            ctx.fillText('RGB', 0, -25);
        }

        ctx.restore();

        // Рисуем терминалы поверх
        this.drawTerminals(ctx);
    }

    getProperties() {
        const baseProps = super.getProperties();
        const properties = {
            ...baseProps,
            'Тип': 'RGB светодиод',
            'Прямое напряжение': `${this.forwardVoltage}V`,
            'Макс. ток': `${(this.maxCurrent * 1000).toFixed(0)}mA`,
            'Яркость': `${Math.round(this.brightness * 100)}%`,
            'Световой поток': `${this.luminousFlux.toFixed(1)} лм`,
            'Температура': `${this.temperature.toFixed(1)}°C`,
            'Эффективность': `${(this.efficiency * 100).toFixed(1)}%`,
            'Цвет': this.ledColor,
            'Красный': `${this.red}`,
            'Зеленый': `${this.green}`,
            'Синий': `${this.blue}`,
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
            red: {
                type: 'range',
                label: 'Красный',
                min: 0,
                max: 255,
                step: 1,
                value: this.red,
                onChange: (value) => {
                    this.red = parseInt(value);
                    this.setRGB(this.red, this.green, this.blue);
                }
            },
            green: {
                type: 'range',
                label: 'Зеленый',
                min: 0,
                max: 255,
                step: 1,
                value: this.green,
                onChange: (value) => {
                    this.green = parseInt(value);
                    this.setRGB(this.red, this.green, this.blue);
                }
            },
            blue: {
                type: 'range',
                label: 'Синий',
                min: 0,
                max: 255,
                step: 1,
                value: this.blue,
                onChange: (value) => {
                    this.blue = parseInt(value);
                    this.setRGB(this.red, this.green, this.blue);
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
}