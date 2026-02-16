class Inductor extends BaseComponent {
    constructor(config = {}) {
        super('inductor', {
            color: '#8B4513',
            width: 60,
            height: 40,
            isAC: true,
            ...config
        });

        this.inductance = config.inductance || 0.001; // 1mH по умолчанию
        this.wireResistance = config.wireResistance || 0.1;
        this.maxCurrent = config.maxCurrent || 1;
        this.coreMaterial = config.coreMaterial || 'air'; // air, iron, ferrite
        this.turns = config.turns || 100;
        this.magneticField = 0; // Тесла

        this.addTerminal('1', 'terminal', 0, this.height/2);
        this.addTerminal('2', 'terminal', this.width, this.height/2);
    }

    // Импеданс катушки: Z = jωL
    getImpedance() {
        if (this.isAC && this.frequency > 0) {
            const inductiveReactance = 2 * Math.PI * this.frequency * this.inductance;
            // Учитываем сопротивление провода
            return Math.sqrt(Math.pow(this.wireResistance, 2) + Math.pow(inductiveReactance, 2));
        }
        return this.wireResistance;
    }

    // Фазовый сдвиг для катушки: +90° (ток отстает от напряжения)
    getPhaseShift() {
        if (this.isAC && this.frequency > 0) {
            const inductiveReactance = 2 * Math.PI * this.frequency * this.inductance;
            return Math.atan2(inductiveReactance, this.wireResistance);
        }
        return 0;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Магнитное поле: B ∝ I
        this.magneticField = this.current * this.turns * 0.001; // Упрощенная формула

        // ЭДС самоиндукции: ε = -L * dI/dt
        // В симуляции мы аппроксимируем это через изменение тока
        const dIdt = this.current - this.previousCurrent;
        const backEMF = -this.inductance * dIdt / deltaTime;

        // Учитываем ЭДС самоиндукции при расчете напряжения
        this.terminals.forEach(terminal => {
            if (terminal.voltage) {
                terminal.voltage += backEMF;
            }
        });

        this.previousCurrent = this.current;

        // Проверка на перегрев
        if (Math.abs(this.current) > this.maxCurrent) {
            this.overheat = true;
            // Увеличение сопротивления при перегреве
            this.wireResistance *= 1.1;
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
            // Для DC ток ограничен только сопротивлением провода
            this.current = this.voltage / this.wireResistance;
        }
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);

        // Катушка
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Рисуем витки
        const turnsToDraw = Math.min(10, this.turns);
        const turnSpacing = 15 / turnsToDraw;

        ctx.beginPath();
        for (let i = 0; i < turnsToDraw; i++) {
            const x = -15 + i * turnSpacing;
            const y1 = -10 + Math.sin(i * 0.5) * 3;
            const y2 = 10 + Math.sin(i * 0.5 + Math.PI) * 3;

            if (i === 0) {
                ctx.moveTo(x, y1);
            } else {
                ctx.lineTo(x, y1);
            }

            ctx.moveTo(x, y2);
            ctx.lineTo(x + turnSpacing, y2);
        }
        ctx.stroke();

        // Сердечник
        if (this.coreMaterial !== 'air') {
            ctx.fillStyle = this.coreMaterial === 'iron' ? '#808080' : '#4A4A4A';
            ctx.fillRect(-10, -5, 20, 10);
        }

        // Выводы
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-15, 0);
        ctx.moveTo(15, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();

        // Значение индуктивности
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';

        let displayValue = this.inductance;
        let suffix = 'H';
        if (displayValue >= 1) {
            // Оставить как есть
        } else if (displayValue >= 0.001) {
            displayValue *= 1000;
            suffix = 'mH';
        } else {
            displayValue *= 1000000;
            suffix = 'μH';
        }

        ctx.fillText(`${displayValue.toFixed(1)}${suffix}`, 0, 25);

        // Магнитное поле
        if (this.magneticField > 0.01) {
            ctx.strokeStyle = '#00ffff';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const radius = 5 + i * 2;
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Индуктивность': `${this.inductance}H`,
            'Сопротивление провода': `${this.wireResistance}Ω`,
            'Количество витков': this.turns,
            'Сердечник': this.coreMaterial,
            'Макс. ток': `${this.maxCurrent}A`,
            'Магнитное поле': `${this.magneticField.toFixed(3)}T`,
            'Реактивное сопротивление': this.isAC ?
                `${(2*Math.PI*this.frequency*this.inductance).toFixed(1)}Ω` : 'N/A',
            'Фазовый сдвиг': this.isAC ?
                `${(this.getPhaseShift() * 180 / Math.PI).toFixed(1)}°` : '0°'
        };
    }
}