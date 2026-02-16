class Resistor extends BaseComponent {
    constructor(config = {}) {
        super('resistor', {
            color: '#964B00',
            width: 60,
            height: 30,
            resistance: config.resistance || 220,
            ...config
        });

        this.tolerance = config.tolerance || 5; // %
        this.powerRating = config.powerRating || 0.25; // Вт
        this.temperature = 20; // °C
        this.tempCoefficient = config.tempCoefficient || 0.0001; // 1/°C

        // Для AC
        this.inductance = config.inductance || 0; // Гн
        this.capacitance = config.capacitance || 0; // Ф

        this.addTerminal('1', 'terminal', 0, this.height/2);
        this.addTerminal('2', 'terminal', this.width, this.height/2);

        this.updateColorBands();
    }

    // Расчет импеданса для AC
    getImpedance() {
        if (this.isAC && this.frequency > 0) {
            const inductiveReactance = 2 * Math.PI * this.frequency * this.inductance;
            const capacitiveReactance = 1 / (2 * Math.PI * this.frequency * this.capacitance || Infinity);

            // Импеданс: Z = √(R² + (XL - XC)²)
            const reactance = inductiveReactance - capacitiveReactance;
            return Math.sqrt(Math.pow(this.resistance, 2) + Math.pow(reactance, 2));
        }
        return this.resistance;
    }

    // Фазовый сдвиг для AC
    getPhaseShift() {
        if (this.isAC && this.frequency > 0) {
            const inductiveReactance = 2 * Math.PI * this.frequency * this.inductance;
            const capacitiveReactance = 1 / (2 * Math.PI * this.frequency * this.capacitance || Infinity);
            const reactance = inductiveReactance - capacitiveReactance;

            return Math.atan2(reactance, this.resistance);
        }
        return 0;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Температурные эффекты
        if (this.power > 0) {
            // Упрощенная модель нагрева
            const tempRise = this.power * 10; // 10°C/Вт
            this.temperature = 20 + tempRise;

            // Изменение сопротивления с температурой
//            const deltaR = this.resistance * this.tempCoefficient * (this.temperature - 20);
//            this.resistance += deltaR;
        }
    }

    updateColorBands() {
        this.bandColors = [];
        const value = this.resistance;

        if (value < 10) {
            this.bandColors = ['black', 'black', 'black', 'gold'];
        } else {
            // Упрощенная цветовая кодировка
            const digits = Math.floor(value).toString().split('');
            for (let i = 0; i < Math.min(3, digits.length); i++) {
                const digit = parseInt(digits[i]);
                this.bandColors.push(this.getColorForDigit(digit));
            }

            // Множитель
            const multiplier = Math.floor(Math.log10(value));
            this.bandColors.push(this.getMultiplierColor(multiplier));

            // Допуск
            this.bandColors.push(this.getToleranceColor(this.tolerance));
        }
    }

    getColorForDigit(digit) {
        const colors = ['black', 'brown', 'red', 'orange', 'yellow',
                       'green', 'blue', 'violet', 'gray', 'white'];
        return colors[digit] || 'black';
    }

    getMultiplierColor(multiplier) {
        const colors = {
            0: 'black', 1: 'brown', 2: 'red', 3: 'orange', 4: 'yellow',
            5: 'green', 6: 'blue', 7: 'violet', 8: 'gray', 9: 'white',
            '-1': 'gold', '-2': 'silver'
        };
        return colors[multiplier] || 'gold';
    }

    getToleranceColor(tolerance) {
        if (tolerance === 1) return 'brown';
        if (tolerance === 2) return 'red';
        if (tolerance === 5) return 'gold';
        if (tolerance === 10) return 'silver';
        return 'gold';
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Корпус резистора
        ctx.fillStyle = '#D2B48C';
        ctx.fillRect(0, 0, this.width, this.height);

        // Цветные полосы
        const bandWidth = 4;
        const bandSpacing = 8;
        let xPos = 10;

        this.bandColors.forEach(color => {
            ctx.fillStyle = color;
            ctx.fillRect(xPos, 5, bandWidth, this.height - 10);
            xPos += bandSpacing;
        });

        // Значение сопротивления
        ctx.fillStyle = '#000000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';

        let displayValue = this.resistance;
        let suffix = 'Ω';
        if (displayValue >= 1000000) {
            displayValue /= 1000000;
            suffix = 'MΩ';
        } else if (displayValue >= 1000) {
            displayValue /= 1000;
            suffix = 'kΩ';
        }

        ctx.fillText(`${displayValue.toFixed(1)}${suffix}`, this.width/2, this.height/2);

        // Для AC показываем импеданс
        if (this.isAC) {
            ctx.fillText(`Z=${this.getImpedance().toFixed(1)}Ω`, this.width/2, this.height/2 + 15);
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Сопротивление': `${this.resistance.toFixed(1)}Ω`,
            'Допуск': `±${this.tolerance}%`,
            'Мощность': `${this.powerRating}W`,
            'Температура': `${this.temperature.toFixed(1)}°C`,
            'Индуктивность': `${this.inductance}H`,
            'Емкость': `${this.capacitance}F`,
            'Фазовый сдвиг': this.isAC ? `${(this.getPhaseShift() * 180 / Math.PI).toFixed(1)}°` : '0°'
        };
    }

    getEditableProperties() {
        return {
            resistance: {
                type: 'range',
                label: 'Сопротивление',
                min: this.minResistance,
                max: this.maxResistance,
                step: 1,
                value: this.resistance,
                unit: 'Ω',
                onChange: (value) => this.setResistance(value)
            },
            tolerance: {
                type: 'select',
                label: 'Допуск',
                options: ['1%', '5%', '10%'],
                value: `${this.tolerance}%`,
                onChange: (value) => {
                    this.tolerance = parseInt(value);
                }
            }
        };
    }
}