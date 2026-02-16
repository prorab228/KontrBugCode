class Capacitor extends BaseComponent {
    constructor(config = {}) {
        super('capacitor', {
            color: '#4169E1',
            width: 40,
            height: 50,
            isAC: true, // Конденсаторы в основном для AC
            ...config
        });

        this.capacitance = config.capacitance || 0.000001; // 1μF по умолчанию
        this.maxVoltage = config.maxVoltage || 50;
        this.leakageResistance = config.leakageResistance || 1000000; // 1MΩ
        this.ESR = config.ESR || 0.1; // Equivalent Series Resistance
        this.charge = 0; // Заряд в Кулонах

        this.addTerminal('+', 'terminal', 0, this.height/2);
        this.addTerminal('-', 'terminal', this.width, this.height/2);
    }

    // Импеданс конденсатора: Z = 1/(jωC) = -j/(ωC)
    getImpedance() {
        if (this.isAC && this.frequency > 0) {
            const capacitiveReactance = 1 / (2 * Math.PI * this.frequency * this.capacitance);
            // Учитываем ESR
            return Math.sqrt(Math.pow(this.ESR, 2) + Math.pow(capacitiveReactance, 2));
        }
        // Для DC - бесконечное сопротивление после зарядки
        return this.charge >= this.capacitance * this.voltage ? Infinity : this.leakageResistance;
    }

    // Фазовый сдвиг для конденсатора: -90° (ток опережает напряжение)
    getPhaseShift() {
        if (this.isAC && this.frequency > 0) {
            const capacitiveReactance = 1 / (2 * Math.PI * this.frequency * this.capacitance);
            return -Math.atan2(capacitiveReactance, this.ESR);
        }
        return 0;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Зарядка/разрядка конденсатора
        if (this.current !== 0) {
            this.charge += this.current * deltaTime;

            // Напряжение на конденсаторе: V = Q/C
            const capacitorVoltage = this.charge / this.capacitance;

            // Устанавливаем напряжение на терминалах
            const terminal1 = this.terminals[0];
            const terminal2 = this.terminals[1];

            if (this.isAC) {
                // Для AC напряжение меняется по синусоиде
                const reactance = 1 / (2 * Math.PI * this.frequency * this.capacitance);
                const currentPhase = this.getPhaseShift();
                terminal1.voltageAC = this.currentAC * reactance;
                terminal1.voltage = terminal1.voltageAC / Math.sqrt(2);
            } else {
                // Для DC
                terminal1.voltage = capacitorVoltage;
                terminal2.voltage = 0;
            }

            // Проверка на пробой
            if (Math.abs(capacitorVoltage) > this.maxVoltage) {
                this.broken = true;
                this.resistance = 0.01; // Короткое замыкание
            }
        }

        // Саморазряд через сопротивление утечки
        if (this.leakageResistance > 0) {
            const dischargeCurrent = this.charge / (this.capacitance * this.leakageResistance);
            this.charge -= dischargeCurrent * deltaTime;
        }
    }

    calculateCurrents() {
        if (this.isAC && this.frequency > 0) {
            const impedance = this.getImpedance();
            if (impedance > 0) {
                this.currentAC = this.voltageAC / impedance;
                this.current = this.currentAC / Math.sqrt(2);
            }
        } else {
            // Для DC ток зависит от процесса зарядки
            const terminal1 = this.terminals[0];
            const terminal2 = this.terminals[1];
            const appliedVoltage = Math.abs((terminal1.voltage || 0) - (terminal2.voltage || 0));
            const capacitorVoltage = this.charge / this.capacitance;

            this.current = (appliedVoltage - capacitorVoltage) / this.ESR;

            // Ограничение тока зарядки
            const maxCurrent = appliedVoltage / this.ESR;
            this.current = Math.max(-maxCurrent, Math.min(maxCurrent, this.current));
        }
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);

        // Корпус конденсатора
        ctx.fillStyle = this.color;
        ctx.fillRect(-15, -20, 30, 40);

        // Обкладки
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        // Положительная обкладка
        ctx.beginPath();
        ctx.rect(-12, -15, 24, 5);
        ctx.stroke();

        // Отрицательная обкладка
        ctx.beginPath();
        ctx.rect(-12, 10, 24, 5);
        ctx.stroke();

        // Выводы
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-15, 0);
        ctx.moveTo(15, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        // Значение емкости
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';

        let displayValue = this.capacitance;
        let suffix = 'F';
        if (displayValue >= 0.001) {
            displayValue *= 1000;
            suffix = 'mF';
        } else if (displayValue >= 0.000001) {
            displayValue *= 1000000;
            suffix = 'μF';
        } else if (displayValue >= 0.000000001) {
            displayValue *= 1000000000;
            suffix = 'nF';
        } else {
            displayValue *= 1000000000000;
            suffix = 'pF';
        }

        ctx.fillText(`${displayValue.toFixed(1)}${suffix}`, 0, 30);

        // Напряжение
        ctx.fillText(`${(this.charge/this.capacitance).toFixed(1)}V`, 0, -30);

        // Индикатор пробоя
        if (this.broken) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        const voltage = this.charge / this.capacitance;

        return {
            ...baseProps,
            'Емкость': `${this.capacitance}F`,
            'Заряд': `${this.charge.toFixed(6)}C`,
            'Напряжение': `${voltage.toFixed(2)}V`,
            'Макс. напряжение': `${this.maxVoltage}V`,
            'ESR': `${this.ESR}Ω`,
            'Реактивное сопротивление': this.isAC ?
                `${(1/(2*Math.PI*this.frequency*this.capacitance)).toFixed(1)}Ω` : 'N/A',
            'Состояние': this.broken ? '🔴 Пробит' :
                       (voltage > this.maxVoltage * 0.8 ? '🟡 Близко к пробою' : '🟢 Норма')
        };
    }
}