class Potentiometer extends BaseComponent {
    constructor(config = {}) {
        super('potentiometer', {
            color: '#8B4513',
            width: 40,
            height: 60,
            resistance: config.resistance || 10000,
            ...config
        });

        // Основные характеристики
        this.totalResistance = config.resistance || 10000; // Общее сопротивление
        this.wiperPosition = config.position || 0.5; // Положение движка 0-1
        this.tolerance = config.tolerance || 20; // Допуск, %
        this.powerRating = config.powerRating || 0.5; // Мощность, Вт
        this.taper = config.taper || 'linear'; // linear, logarithmic, reverse_log

        // Расчетные сопротивления
        this.resistance1 = this.totalResistance * this.wiperPosition; // Между концом 1 и движком
        this.resistance2 = this.totalResistance * (1 - this.wiperPosition); // Между движком и концом 2

        // Анимация
        this.rotationAngle = this.wiperPosition * 300 - 150; // -150° to +150°
        this.knobRotation = 0;

        // Терминалы
        this.addTerminal('1', 'terminal', 0, this.height/2);
        this.addTerminal('2', 'terminal', this.width/2, 0);
        this.addTerminal('3', 'terminal', this.width, this.height/2);

        // Текущие напряжения и токи
        this.voltageAcross = 0; // Напряжение между крайними выводами
        this.wiperVoltage = 0; // Напряжение на движке
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Обновляем сопротивления на основе положения движка
        this.updateResistances();

        // Получаем терминалы
        const terminal1 = this.terminals.find(t => t.name === '1');
        const terminal2 = this.terminals.find(t => t.name === '2'); // Движок
        const terminal3 = this.terminals.find(t => t.name === '3');

        if (!terminal1 || !terminal2 || !terminal3) return;

        // Напряжение между крайними выводами
        const voltage1 = terminal1.voltage || 0;
        const voltage3 = terminal3.voltage || 0;
        this.voltageAcross = Math.abs(voltage1 - voltage3);

        // Если потенциометр используется как делитель напряжения
        if (this.voltageAcross > 0) {
            // Рассчитываем напряжение на движке
            if (voltage1 > voltage3) {
                this.wiperVoltage = voltage3 + (this.voltageAcross * this.wiperPosition);
            } else {
                this.wiperVoltage = voltage1 + (this.voltageAcross * (1 - this.wiperPosition));
            }

            // Устанавливаем напряжение на движке
            terminal2.voltage = this.wiperVoltage;

            // Для AC
            if (this.isAC) {
                const voltageAC1 = terminal1.voltageAC || 0;
                const voltageAC3 = terminal3.voltageAC || 0;
                const voltageACAcross = Math.sqrt(
                    Math.pow(voltageAC1, 2) + Math.pow(voltageAC3, 2)
                ) / Math.sqrt(2);

                if (voltageAC1 > voltageAC3) {
                    terminal2.voltageAC = voltageAC3 + (voltageACAcross * this.wiperPosition);
                } else {
                    terminal2.voltageAC = voltageAC1 + (voltageACAcross * (1 - this.wiperPosition));
                }
            }

            // Расчет тока через потенциометр
            if (this.totalResistance > 0) {
                this.current = this.voltageAcross / this.totalResistance;
                this.power = Math.pow(this.current, 2) * this.totalResistance;
            }
        } else {
            // Если потенциометр не используется как делитель
            this.current = 0;
            this.power = 0;
            terminal2.voltage = (voltage1 + voltage3) / 2;
        }

        // Проверка на превышение мощности
        if (this.power > this.powerRating) {
            this.overheat = true;
            if (this.power > this.powerRating * 2) {
                this.broken = true;
                // При перегорании сопротивление становится бесконечным
                this.totalResistance = Infinity;
                this.resistance1 = Infinity;
                this.resistance2 = Infinity;
            }
        }

        // Анимация ручки
        this.knobRotation += deltaTime * 2;
        if (this.knobRotation > Math.PI * 2) this.knobRotation -= Math.PI * 2;
    }

    updateResistances() {
        // Применяем характеристику (линейная, логарифмическая и т.д.)
        let effectivePosition = this.wiperPosition;

        switch(this.taper) {
            case 'logarithmic':
                // Логарифмическая характеристика (для аудио)
                effectivePosition = Math.pow(this.wiperPosition, 2);
                break;
            case 'reverse_log':
                // Обратная логарифмическая
                effectivePosition = 1 - Math.pow(1 - this.wiperPosition, 2);
                break;
            case 'audio':
                // Аудио характеристика (специальная)
                effectivePosition = Math.pow(this.wiperPosition, 1.5);
                break;
            // linear остается по умолчанию
        }

        this.resistance1 = this.totalResistance * effectivePosition;
        this.resistance2 = this.totalResistance * (1 - effectivePosition);

        // Общее сопротивление (для BaseComponent)
        this.resistance = this.totalResistance;
    }

    setPosition(position) {
        const newPosition = Math.max(0, Math.min(1, position));
        const oldPosition = this.wiperPosition;
        this.wiperPosition = newPosition;

        // Обновляем угол для анимации
        this.rotationAngle = this.wiperPosition * 300 - 150;

        console.log(`${this.name}: положение изменено с ${oldPosition.toFixed(2)} на ${newPosition.toFixed(2)}`);

        // Обновляем цепь
        if (window.simulator) {
            window.simulator.circuitAnalyzer.solveCircuit();
        }
    }

    // Управление с клавиатуры или мыши
    increasePosition(step = 0.05) {
        this.setPosition(this.wiperPosition + step);
    }

    decreasePosition(step = 0.05) {
        this.setPosition(this.wiperPosition - step);
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;

        ctx.translate(centerX, centerY);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Корпус потенциометра
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-15, -20, 30, 40, 5);
        ctx.fill();

        // Граница
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Шкала
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, -Math.PI/6, Math.PI * 7/6);
        ctx.stroke();

        // Ручка/движок
        const angleRad = this.rotationAngle * Math.PI / 180;
        ctx.save();
        ctx.rotate(angleRad);

        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 20);
        ctx.stroke();

        // Кружок на конце ручки
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.arc(0, 20, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Отметки на шкале
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const markAngle = -Math.PI/6 + (i/10) * (Math.PI * 8/6);
            const startRadius = i % 5 === 0 ? 18 : 20;
            const endRadius = 22;

            ctx.beginPath();
            ctx.moveTo(
                Math.cos(markAngle) * startRadius,
                Math.sin(markAngle) * startRadius
            );
            ctx.lineTo(
                Math.cos(markAngle) * endRadius,
                Math.sin(markAngle) * endRadius
            );
            ctx.stroke();
        }

        // Цифровое значение
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';

        const resistanceValue = Math.round(this.resistance1);
        ctx.fillText(`${resistanceValue}Ω`, 0, 35);

        // Положение в %
        ctx.fillText(`${Math.round(this.wiperPosition * 100)}%`, 0, -30);

        // Индикатор типа
        if (this.taper !== 'linear') {
            ctx.font = '8px Arial';
            ctx.fillText(this.taper.toUpperCase(), 0, -40);
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        const taperNames = {
            'linear': 'Линейная',
            'logarithmic': 'Логарифмическая',
            'reverse_log': 'Обратная логарифмическая',
            'audio': 'Аудио'
        };

        return {
            ...baseProps,
            'Общее сопротивление': `${this.totalResistance}Ω`,
            'Положение движка': `${Math.round(this.wiperPosition * 100)}%`,
            'R1-движок': `${Math.round(this.resistance1)}Ω`,
            'Rдвижок-2': `${Math.round(this.resistance2)}Ω`,
            'Напряжение на движке': `${this.wiperVoltage.toFixed(2)}V`,
            'Характеристика': taperNames[this.taper] || this.taper,
            'Допуск': `±${this.tolerance}%`,
            'Мощность': `${this.powerRating}W`,
            'Состояние': this.broken ? '🔴 Перегорел' :
                       this.overheat ? '🟡 Перегрев' : '🟢 Норма'
        };
    }

    getEditableProperties() {
        return {
            position: {
                type: 'range',
                label: 'Положение движка',
                min: 0,
                max: 1,
                step: 0.01,
                value: this.wiperPosition,
                onChange: (value) => this.setPosition(value)
            },
            taper: {
                type: 'select',
                label: 'Характеристика',
                options: [
                    { value: 'linear', label: 'Линейная' },
                    { value: 'logarithmic', label: 'Логарифмическая' },
                    { value: 'reverse_log', label: 'Обратная логарифмическая' },
                    { value: 'audio', label: 'Аудио' }
                ],
                value: this.taper,
                onChange: (value) => {
                    this.taper = value;
                    this.updateResistances();
                }
            }
        };
    }
}