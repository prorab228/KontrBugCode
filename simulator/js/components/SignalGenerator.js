class SignalGenerator extends BaseComponent {
    constructor(config = {}) {
        super('signalgenerator', {
            color: '#6B5B95',
            width: 70,
            height: 50,
            isSignalSource: true,
            ...config
        });

        this.amplitude = config.amplitude || 5;
        this.frequency = config.frequency || 1000;
        this.offset = config.offset || 2.5;
        this.waveform = config.waveform || 'sine';
        this.dutyCycle = config.dutyCycle || 50; // Для прямоугольного сигнала

        this.addTerminal('OUT', 'signal', this.width, this.height/2);
        this.addTerminal('GND', 'ground', 0, this.height/2);

        this.signalAngle = 0;
    }

    isSignalSource() {
        return true;
    }

    getTerminalVoltage(terminalName, time = 0) {
        if (terminalName === 'GND') return 0;

        const angularFreq = 2 * Math.PI * this.frequency;
        let signal = 0;

        switch(this.waveform) {
            case 'sine':
                signal = Math.sin(angularFreq * time);
                break;
            case 'square':
                const period = 1 / this.frequency;
                const pos = (time % period) / period;
                signal = pos < (this.dutyCycle / 100) ? 1 : -1;
                break;
            case 'triangle':
                const triPos = (time % (1/this.frequency)) * this.frequency;
                signal = 2 * Math.abs(2 * triPos - 1) - 1;
                break;
            case 'sawtooth':
                const sawPos = (time % (1/this.frequency)) * this.frequency;
                signal = 2 * sawPos - 1;
                break;
            case 'noise':
                signal = Math.random() * 2 - 1;
                break;
        }

        return this.offset + (signal * this.amplitude / 2);
    }

    updateSignal(time) {
        this.signalAngle += 0.1;
        if (this.signalAngle > 2 * Math.PI) this.signalAngle -= 2 * Math.PI;

        const outputTerminal = this.terminals.find(t => t.name === 'OUT');
        if (outputTerminal) {
            outputTerminal.voltage = this.getTerminalVoltage('OUT', time);
        }

        this.voltage = outputTerminal?.voltage || 0;
    }

    updateFromInputs(timeDelta) {
        this.time += timeDelta;
        this.updateSignal(this.time);
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);

        // Осциллограф
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-25, -15, 50, 30);

        // Сетка
        ctx.strokeStyle = '#CCCCCC';
        ctx.beginPath();
        for (let i = -10; i <= 10; i += 5) {
            ctx.moveTo(-25, i);
            ctx.lineTo(25, i);
        }
        for (let i = -25; i <= 25; i += 5) {
            ctx.moveTo(i, -15);
            ctx.lineTo(i, 15);
        }
        ctx.stroke();

        // Сигнал
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const points = 50;
        for (let i = 0; i <= points; i++) {
            const x = (i / points - 0.5) * 50;
            const t = this.time + (i / points) * (1 / this.frequency);
            const y = ((this.getTerminalVoltage('OUT', t) - this.offset) / this.amplitude) * 15;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Информация
        ctx.fillStyle = '#000000';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.frequency}Hz`, 0, -20);

        ctx.restore();
    }

    getProperties() {
        return {
            ...super.getProperties(),
            'Тип': 'Генератор сигналов',
            'Амплитуда': `${this.amplitude.toFixed(2)}V`,
            'Смещение': `${this.offset.toFixed(2)}V`,
            'Частота': `${this.frequency}Hz`,
            'Форма': this.waveform,
            'Скважность': this.waveform === 'square' ? `${this.dutyCycle}%` : 'N/A'
        };
    }

    getEditableProperties() {
        const props = {
            ...super.getEditableProperties(),
            amplitude: {
                type: 'range',
                label: 'Амплитуда',
                min: 0.1,
                max: 10,
                step: 0.1,
                value: this.amplitude,
                unit: 'V',
                onChange: (value) => { this.amplitude = parseFloat(value); }
            },
            frequency: {
                type: 'range',
                label: 'Частота',
                min: 1,
                max: 10000,
                step: 1,
                value: this.frequency,
                unit: 'Hz',
                onChange: (value) => { this.frequency = parseFloat(value); }
            },
            offset: {
                type: 'range',
                label: 'Смещение',
                min: 0,
                max: 10,
                step: 0.1,
                value: this.offset,
                unit: 'V',
                onChange: (value) => { this.offset = parseFloat(value); }
            },
            waveform: {
                type: 'select',
                label: 'Форма волны',
                options: [
                    { value: 'sine', label: 'Синус' },
                    { value: 'square', label: 'Прямоугольная' },
                    { value: 'triangle', label: 'Треугольная' },
                    { value: 'sawtooth', label: 'Пилообразная' },
                    { value: 'noise', label: 'Шум' }
                ],
                value: this.waveform,
                onChange: (value) => { this.waveform = value; }
            }
        };

        if (this.waveform === 'square') {
            props.dutyCycle = {
                type: 'range',
                label: 'Скважность',
                min: 1,
                max: 99,
                step: 1,
                value: this.dutyCycle,
                unit: '%',
                onChange: (value) => { this.dutyCycle = parseFloat(value); }
            };
        }

        return props;
    }
}