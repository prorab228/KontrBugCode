// Класс источника переменного тока
// Моделирует AC источники с различными формами сигнала и фазами
class ACSource extends VoltageSource {
    constructor(config = {}) {
        super('ac_source', {
            color: '#FF6600',
            isAC: true,
            voltageAC: config.voltage || 220, // Амплитудное значение
            frequency: config.frequency || 50, // Частота в Гц
            waveform: config.waveform || 'sine',
            ...config
        });

        this.voltageRMS = this.outputVoltageAC / Math.sqrt(2); // Действующее значение
        this.phaseAngle = config.phase || 0; // Начальная фаза в радианах
        this.hasNeutral = config.hasNeutral !== undefined ? config.hasNeutral : true; // Наличие нейтрали

        // Конфигурация терминалов в зависимости от типа сети
        if (this.hasNeutral) {
            // Однофазная сеть: фаза, нейтраль, земля
            this.addTerminal('L', 'phase', 0, this.height/2);
            this.addTerminal('N', 'neutral', this.width, this.height/2);
            this.addTerminal('PE', 'ground', this.width/2, this.height);
        } else {
            // Двухфазная сеть без нейтрали
            this.addTerminal('L1', 'phase', 0, this.height/3);
            this.addTerminal('L2', 'phase', this.width, this.height/3);
            this.addTerminal('PE', 'ground', this.width/2, this.height);
        }
    }

    // Получение мгновенного напряжения для конкретного терминала
    getInstantaneousVoltage(time = null, terminal = 'L') {
        if (!this.isEnabled || this.broken) return 0;

        const t = time !== null ? time : this.time;
        let phaseOffset = 0;

        // Для второй фазы сдвиг на 180 градусов
        if (terminal === 'L2' && !this.hasNeutral) {
            phaseOffset = Math.PI;
        }

        const baseVoltage = super.getInstantaneousVoltage(t);
        return baseVoltage * Math.cos(this.phaseAngle + phaseOffset);
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Устанавливаем напряжения на терминалах в соответствии с типом сети
        this.terminals.forEach(terminal => {
            if (terminal.type === 'phase') {
                if (terminal.name === 'L' || terminal.name === 'L1') {
                    terminal.voltageAC = this.outputVoltageAC;
                    terminal.voltage = this.voltageRMS;
                } else if (terminal.name === 'L2') {
                    terminal.voltageAC = this.outputVoltageAC;
                    terminal.voltage = this.voltageRMS;
                }
            } else if (terminal.type === 'neutral') {
                terminal.voltage = 0;
                terminal.voltageAC = 0;
            } else if (terminal.type === 'ground') {
                terminal.voltage = 0;
                terminal.voltageAC = 0;
            }
        });
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Символ переменного тока (синусоида)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        // Рисуем синусоиду
        ctx.beginPath();
        for (let i = 10; i < this.width - 10; i += 2) {
            const x = i;
            const y = this.height/2 + 10 * Math.sin((i - 10) * 0.2);
            if (i === 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Обозначения выводов
        ctx.fillStyle = '#000000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';

        if (this.hasNeutral) {
            ctx.fillText('L', 15, this.height/2 - 10);
            ctx.fillText('N', this.width - 15, this.height/2 - 10);
            ctx.fillText('PE', this.width/2, this.height - 5);
        } else {
            ctx.fillText('L1', 15, this.height/3 - 10);
            ctx.fillText('L2', this.width - 15, this.height/3 - 10);
            ctx.fillText('PE', this.width/2, this.height - 5);
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Напряжение (амплитуда)': `${this.outputVoltageAC.toFixed(1)}V`,
            'Напряжение (RMS)': `${this.voltageRMS.toFixed(1)}V`,
            'Частота': `${this.frequency}Hz`,
            'Фаза': `${(this.phaseAngle * 180 / Math.PI).toFixed(1)}°`,
            'Тип': this.hasNeutral ? 'Однофазный' : 'Двухфазный'
        };
    }
}