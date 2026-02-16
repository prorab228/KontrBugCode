class Motor extends BaseComponent {
    constructor(config = {}) {
        super('motor', {
            color: '#2E8B57',
            width: 60,
            height: 50,
            resistance: config.resistance || 24,
            isAC: config.isAC || false,
            ...config
        });

        // Характеристики двигателя
        this.ratedVoltage = config.voltage || 12; // Номинальное напряжение
        this.ratedCurrent = config.current || 0.5; // Номинальный ток
        this.ratedSpeed = config.speed || 3000; // Оборотов в минуту
        this.torque = config.torque || 0.1; // Номинальный момент, Н·м
        this.efficiency = config.efficiency || 0.8; // КПД

        // Состояние двигателя
        this.speed = 0; // Текущая скорость, об/мин
        this.targetSpeed = 0; // Целевая скорость
        this.direction = 1; // Направление вращения: 1 вперед, -1 назад
        this.rotationAngle = 0; // Угол вращения для анимации
        this.isRunning = false;
        this.isStalled = false;

        // Механические характеристики
        this.inertia = config.inertia || 0.001; // Момент инерции
        this.friction = config.friction || 0.01; // Коэффициент трения

        // Для AC двигателей
        if (this.isAC) {
            this.frequency = config.frequency || 50;
            this.polePairs = config.polePairs || 2; // Количество пар полюсов
            this.slip = 0; // Скольжение
            this.synchronousSpeed = (120 * this.frequency) / this.polePairs; // Синхронная скорость
        }

        // Терминалы
        if (this.isAC) {
            this.addTerminal('L1', 'phase', 0, this.height/3);
            this.addTerminal('L2', 'phase', this.width, this.height/3);
            this.addTerminal('PE', 'ground', this.width/2, this.height);
        } else {
            this.addTerminal('V+', 'power', 0, this.height/2);
            this.addTerminal('GND', 'ground', this.width, this.height/2);
            if (config.hasPWM) {
                this.addTerminal('PWM', 'signal', this.width/2, 0);
            }
        }
    }

    update(deltaTime) {
        super.update(deltaTime);

        const positiveTerminal = this.terminals.find(t => t.name === 'V+' || t.name === 'L1');
        const negativeTerminal = this.terminals.find(t => t.name === 'GND' || t.name === 'L2');

        if (!positiveTerminal || !negativeTerminal) return;

        // Напряжение на двигателе
        const voltageDiff = Math.abs(
            (positiveTerminal.voltage || 0) - (negativeTerminal.voltage || 0)
        );

        // Для AC двигателей
        if (this.isAC) {
            const voltageAC1 = positiveTerminal.voltageAC || 0;
            const voltageAC2 = negativeTerminal.voltageAC || 0;
            const voltageAC = Math.sqrt(Math.pow(voltageAC1, 2) + Math.pow(voltageAC2, 2)) / Math.sqrt(2);
            this.voltage = voltageAC;

            // Синхронная скорость для AC двигателя
            this.targetSpeed = this.synchronousSpeed * (1 - this.slip);
        } else {
            this.voltage = voltageDiff;

            // Целевая скорость пропорциональна напряжению для DC двигателя
            this.targetSpeed = (this.voltage / this.ratedVoltage) * this.ratedSpeed;

            // Определение направления по полярности
            const actualVoltage = (positiveTerminal.voltage || 0) - (negativeTerminal.voltage || 0);
            this.direction = actualVoltage >= 0 ? 1 : -1;
        }

        // Расчет тока
        if (this.resistance > 0) {
            this.current = this.voltage / this.resistance;

            // Противо-ЭДС (back EMF)
            const backEMF = (this.speed / this.ratedSpeed) * this.ratedVoltage;
            this.current = (this.voltage - backEMF) / this.resistance;

            // Ограничение тока
            this.current = Math.max(-this.ratedCurrent * 2, Math.min(this.ratedCurrent * 2, this.current));
        }

        // Расчет мощности
        this.power = this.voltage * this.current;
        const mechanicalPower = this.power * this.efficiency;

        // Расчет момента (упрощенно)
        if (this.speed > 0) {
            this.torque = (mechanicalPower * 60) / (2 * Math.PI * this.speed);
        }

        // Механическое уравнение движения
        const accelerationTorque = this.torque - (this.friction * this.speed / 60);
        const acceleration = accelerationTorque / this.inertia;

        // Интегрируем ускорение для получения скорости
        this.speed += acceleration * deltaTime;

        // Плавный переход к целевой скорости
        const speedDiff = this.targetSpeed - this.speed;
        this.speed += speedDiff * deltaTime * 5; // Коэффициент плавности

        // Ограничение скорости
        this.speed = Math.max(-this.ratedSpeed * 1.5, Math.min(this.ratedSpeed * 1.5, this.speed));

        // Вращение для анимации
        if (Math.abs(this.speed) > 10) {
            this.rotationAngle += (this.speed / 60) * 360 * deltaTime * this.direction;
            if (this.rotationAngle > 360) this.rotationAngle -= 360;
            if (this.rotationAngle < 0) this.rotationAngle += 360;
        }

        // Проверка состояния
        this.isRunning = Math.abs(this.speed) > this.ratedSpeed * 0.1;
        this.isStalled = Math.abs(this.current) > this.ratedCurrent * 1.5 && Math.abs(this.speed) < this.ratedSpeed * 0.1;

        // Проверка на перегрев
        if (this.current > this.ratedCurrent * 1.2 || this.power > this.getMaxPower()) {
            this.overheat = true;
            if (this.current > this.ratedCurrent * 2) {
                this.broken = true;
                this.resistance = 0.01; // Короткое замыкание обмотки
            }
        }

        // Для AC двигателя рассчитываем скольжение
        if (this.isAC && this.synchronousSpeed > 0) {
            this.slip = Math.max(0, (this.synchronousSpeed - Math.abs(this.speed)) / this.synchronousSpeed);
        }
    }

    getMaxPower() {
        return this.ratedVoltage * this.ratedCurrent * 1.5; // 150% от номинальной
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;

        ctx.translate(centerX, centerY);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Корпус двигателя
        ctx.fillStyle = this.overheat ? '#ff4444' : this.color;
        ctx.beginPath();
        ctx.roundRect(-25, -20, 50, 40, 5);
        ctx.fill();

        // Граница
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Вал двигателя
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.arc(30, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Ротор
        ctx.save();
        ctx.rotate(this.rotationAngle * Math.PI / 180);

        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = Math.cos(angle) * 10;
            const y1 = Math.sin(angle) * 10;
            const x2 = Math.cos(angle) * 20;
            const y2 = Math.sin(angle) * 20;

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();

        ctx.restore();

        // Индикация вращения
        if (Math.abs(this.speed) > 100) {
            ctx.strokeStyle = '#00ffff';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + this.rotationAngle * Math.PI / 180;
                const length = 5 + Math.abs(this.speed) * 0.01;

                ctx.moveTo(
                    35 + Math.cos(angle) * 25,
                    Math.sin(angle) * 25
                );
                ctx.lineTo(
                    35 + Math.cos(angle) * (25 + length),
                    Math.sin(angle) * (25 + length)
                );
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        // Информация
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';

        ctx.fillText(`${Math.round(Math.abs(this.speed))} RPM`, this.width/2, -10);

        if (this.current > 0) {
            ctx.fillText(`${(this.current * 1000).toFixed(0)}mA`, this.width/2, this.height + 15);
        }

        if (this.isStalled) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('ЗАБЛОКИРОВАН', this.width/2, this.height/2);
        }

        if (this.isAC) {
            ctx.fillStyle = '#ffff00';
            ctx.fillText('AC', this.width/2, -25);
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Номинальное напряжение': `${this.ratedVoltage}V`,
            'Номинальный ток': `${this.ratedCurrent}A`,
            'Номинальная скорость': `${this.ratedSpeed} RPM`,
            'Текущая скорость': `${Math.round(this.speed)} RPM`,
            'Момент': `${this.torque.toFixed(3)} Н·м`,
            'КПД': `${(this.efficiency * 100).toFixed(1)}%`,
            'Направление': this.direction > 0 ? 'Вперед' : 'Назад',
            'Тип': this.isAC ? 'Переменный ток' : 'Постоянный ток',
            'Состояние': this.broken ? '🔴 Сгорел' :
                       this.isStalled ? '🔴 Заблокирован' :
                       this.overheat ? '🟡 Перегрев' :
                       this.isRunning ? '🟢 Работает' : '⚫ Остановлен'
        };
    }
}