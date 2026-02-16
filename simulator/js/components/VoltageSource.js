// Базовый класс для всех источников напряжения (AC и DC)
// Обеспечивает общую функциональность для батарей, блоков питания, генераторов и т.д.
class VoltageSource extends BaseComponent {
    constructor(type, config = {}) {
        super(type, {
            color: '#FF9900',
            width: 60,
            height: 40,
            ...config
        });

        this.outputVoltage = config.voltage || 12; // Выходное напряжение DC
        this.outputVoltageAC = config.voltageAC || 0; // Амплитуда AC
        this.internalResistance = config.internalResistance || 0.01; // Внутреннее сопротивление
        this.maxCurrent = config.maxCurrent || 2; // Максимальный ток
        this.isEnabled = config.isEnabled !== undefined ? config.isEnabled : true;

        // Для AC
        this.waveform = config.waveform || 'sine'; // Форма сигнала: sine, square, triangle, sawtooth
        this.dutyCycle = config.dutyCycle || 0.5; // Скважность для прямоугольного сигнала

        this.addTerminal('+', 'output', 0, this.height/2);
        this.addTerminal('-', 'ground', this.width, this.height/2);
    }

    // Источник является активным компонентом, создающим напряжение
    isVoltageSource() {
        return this.isEnabled && !this.broken;
    }

    // Получение мгновенного выходного напряжения (для AC)
    getInstantaneousVoltage(time = null) {
        if (!this.isEnabled || this.broken) return 0;

        const t = time !== null ? time : this.time;

        if (this.isAC && this.frequency > 0) {
            switch(this.waveform) {
                case 'sine':
                    return this.outputVoltageAC * Math.sin(this.omega * t);
                case 'square':
                    return Math.sin(this.omega * t) > 0 ?
                           this.outputVoltageAC : -this.outputVoltageAC;
                case 'triangle':
                    const period = 1 / this.frequency;
                    const phase = (t % period) / period;
                    return this.outputVoltageAC * (2 * Math.abs(2 * phase - 1) - 1);
                case 'sawtooth':
                    const phase2 = (t % (1/this.frequency)) * this.frequency;
                    return this.outputVoltageAC * (2 * phase2 - 1);
                default:
                    return this.outputVoltageAC * Math.sin(this.omega * t);
            }
        } else {
            return this.outputVoltage;
        }
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Устанавливаем напряжение на терминалах
        const positiveTerminal = this.terminals.find(t => t.name === '+');
        const negativeTerminal = this.terminals.find(t => t.name === '-');

        if (positiveTerminal && negativeTerminal) {
            const instantVoltage = this.getInstantaneousVoltage();

            if (this.isAC) {
                positiveTerminal.voltageAC = Math.abs(instantVoltage);
                positiveTerminal.voltage = this.outputVoltageAC / Math.sqrt(2); // RMS значение
                negativeTerminal.voltage = 0;
                negativeTerminal.voltageAC = 0;
            } else {
                positiveTerminal.voltage = this.outputVoltage;
                negativeTerminal.voltage = 0;
            }

            // Учитываем падение напряжения на внутреннем сопротивлении
            const voltageDrop = this.current * this.internalResistance;
            if (this.isAC) {
                positiveTerminal.voltageAC = Math.max(0, positiveTerminal.voltageAC - voltageDrop);
            } else {
                positiveTerminal.voltage = Math.max(0, positiveTerminal.voltage - voltageDrop);
            }
        }

        // Проверка на перегрузку по току
        if (this.current > this.maxCurrent) {
            this.overheat = true;
            if (this.current > this.maxCurrent * 1.5) {
                this.broken = true;
                this.isEnabled = false;
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Корпус источника
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, this.width, this.height);

        // Символ источника напряжения
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        // Плюс и минус
        ctx.beginPath();
        ctx.moveTo(15, this.height/2);
        ctx.lineTo(25, this.height/2);
        ctx.moveTo(20, this.height/2 - 5);
        ctx.lineTo(20, this.height/2 + 5);

        ctx.moveTo(this.width - 15, this.height/2 - 5);
        ctx.lineTo(this.width - 25, this.height/2 - 5);
        ctx.moveTo(this.width - 20, this.height/2);
        ctx.lineTo(this.width - 20, this.height/2 + 5);
        ctx.stroke();

        // Отображение напряжения
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';

        if (this.isAC) {
            ctx.fillText(`${this.outputVoltageAC.toFixed(1)}V AC`, this.width/2, this.height/2 - 8);
            ctx.fillText(`${this.frequency}Hz`, this.width/2, this.height/2 + 8);

            // Мини-график формы сигнала
            ctx.strokeStyle = '#ffff00';
            ctx.beginPath();
            for (let i = 5; i < this.width - 5; i++) {
                const x = i;
                const t = (i - 5) / (this.width - 10);
                const y = this.height/2 + 15 * Math.sin(2 * Math.PI * 2 * t);
                if (i === 5) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        } else {
            ctx.fillText(`${this.outputVoltage.toFixed(1)}V DC`, this.width/2, this.height/2);
        }

        // Индикатор состояния
        if (!this.isEnabled) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.width - 10, 10, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Выходное напряжение': `${this.outputVoltage}V${this.isAC ? ' AC' : ' DC'}`,
            'Макс. ток': `${this.maxCurrent}A`,
            'Внутр. сопротивление': `${this.internalResistance}Ω`,
            'Состояние': this.broken ? '🔴 Сломан' :
                        !this.isEnabled ? '🔴 Выключен' :
                        this.overheat ? '🟡 Перегрев' : '🟢 Включен',
            'Форма сигнала': this.isAC ? this.waveform : 'DC'
        };
    }
}