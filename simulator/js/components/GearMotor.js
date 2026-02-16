class GearMotor extends Motor {
    constructor(config = {}) {
        super({
            ...config,
            color: '#27ae60',
            name: config.name || 'Мотор-редуктор'
        });

        this.type = 'gear_motor';

        // Параметры редуктора
        this.gearRatio = config.gearRatio || 50;           // Передаточное число
        this.efficiency = config.efficiency || 0.85;       // КПД редуктора (85%)
        this.backlash = config.backlash || 2;              // Люфт в градусах

        // Выходные параметры (после редуктора)
        this.outputSpeed = 0;          // Скорость на выходном валу (об/мин)
        this.outputTorque = 0;         // Крутящий момент на выходном валу (Н·м)
        this.outputAngle = 0;          // Угол поворота выходного вала (град)
        this.outputPower = 0;          // Мощность на выходе

        // Механические параметры
        this.loadTorque = config.loadTorque || 0;          // Нагрузка на валу
        this.maxTorque = config.maxTorque || 2;            // Максимальный момент (Н·м)
        this.stallTorque = config.stallTorque || 2.5;      // Момент стопорения

        // Шестерни (для визуализации)
        this.gears = this.createGears();
    }

    createGears() {
        // Создаем виртуальные шестерни для отображения
        return [
            {
                teeth: 10,      // Количество зубьев ведущей шестерни
                radius: 8,
                angle: 0,
                color: '#333333'
            },
            {
                teeth: 10 * this.gearRatio, // Количество зубьев ведомой шестерни
                radius: 8 * Math.sqrt(this.gearRatio),
                angle: 0,
                color: '#666666'
            }
        ];
    }

    update(deltaTime) {
        // Вызываем родительский метод для обновления мотора
        super.update(deltaTime);

        // Рассчитываем выходные параметры через редуктор
        if (this.speed > 0 && !this.isStalled) {
            // Входная скорость от двигателя (об/мин)
            const motorRPM = (this.speed / 100) * this.noLoadRPM;

            // Выходная скорость через редуктор
            this.outputSpeed = motorRPM / this.gearRatio;

            // Входной крутящий момент двигателя
            const motorTorque = this.torque;

            // Выходной крутящий момент с учетом редуктора и КПД
            this.outputTorque = motorTorque * this.gearRatio * this.efficiency;

            // Учитываем нагрузку
            if (this.loadTorque > 0) {
                const loadEffect = Math.min(1, this.loadTorque / this.maxTorque);
                this.outputSpeed *= (1 - loadEffect * 0.5);
                this.outputTorque = Math.max(this.outputTorque, this.loadTorque);
            }

            // Выходная мощность
            this.outputPower = (this.outputTorque * this.outputSpeed * 2 * Math.PI) / 60;

            // Угол поворота выходного вала
            this.outputAngle += (this.outputSpeed * 6 * deltaTime); // 6 = 360/60

            // Обновляем углы шестерен
            this.gears[0].angle += (this.speed * deltaTime * 10);
            this.gears[1].angle += (this.outputSpeed * deltaTime * 6);

            // Проверка на перегрузку
            if (this.outputTorque > this.maxTorque) {
                this.isStalled = true;
                this.speed = 0;
                this.outputSpeed = 0;
                this.overheat = true;
            }

            // Проверка на стопорение
            if (this.outputTorque > this.stallTorque) {
                this.broken = true;
                this.speed = 0;
                this.outputSpeed = 0;
                this.outputTorque = 0;
            }
        } else {
            this.outputSpeed = 0;
            this.outputTorque = 0;
            this.outputPower = 0;
        }

        // Обновляем ток и мощность с учетом КПД
        this.current = this.speed > 0 ? (0.5 + (this.speed / 100) * 1.5) : 0;
        this.power = this.current * this.voltage;
    }

    // Установить нагрузку на вал
    setLoad(torque) {
        this.loadTorque = Math.max(0, Math.min(this.maxTorque, torque));
    }

    // Получить механическую мощность
    getMechanicalPower() {
        return this.outputPower;
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);

        // Рисуем редуктор
        this.drawGearbox(ctx);

        // Выходной вал
        ctx.fillStyle = '#333333';
        ctx.fillRect(35, -5, 15, 10);

        // Информация о редукторе
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';

        // Передаточное число
        ctx.fillText(`1:${this.gearRatio}`, 0, 30);

        // Выходная скорость
        ctx.fillText(`${Math.round(this.outputSpeed)} об/мин`, 0, 40);

        // Выходной момент
        ctx.fillText(`${this.outputTorque.toFixed(2)} Н·м`, 0, 50);

        // Нагрузка (если есть)
        if (this.loadTorque > 0) {
            ctx.fillStyle = '#ff9900';
            ctx.fillText(`Нагрузка: ${this.loadTorque.toFixed(2)} Н·м`, 0, -30);
        }

        ctx.restore();
    }

    drawGearbox(ctx) {
        // Корпус редуктора
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-25, -20, 50, 40);

        // Шестерни
        this.gears.forEach((gear, index) => {
            ctx.save();

            if (index === 0) {
                // Ведущая шестерня (маленькая)
                ctx.translate(-15, 0);
                ctx.rotate(gear.angle * Math.PI / 180);
            } else {
                // Ведомая шестерня (большая)
                ctx.translate(15, 0);
                ctx.rotate(gear.angle * Math.PI / 180);
            }

            // Ось шестерни
            ctx.fillStyle = '#666666';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();

            // Зубья шестерни
            ctx.strokeStyle = gear.color;
            ctx.lineWidth = 2;
            const teeth = gear.teeth;
            const radius = gear.radius;

            for (let i = 0; i < teeth; i++) {
                const angle = (i / teeth) * Math.PI * 2;
                const toothLength = 4;

                const x1 = Math.cos(angle) * radius;
                const y1 = Math.sin(angle) * radius;
                const x2 = Math.cos(angle) * (radius + toothLength);
                const y2 = Math.sin(angle) * (radius + toothLength);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // Основание шестерни
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        });

        // Соединение шестерен (цепь или зубчатая передача)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-15 + this.gears[0].radius, 0);
        ctx.lineTo(15 - this.gears[1].radius, 0);
        ctx.stroke();

        // Вал двигателя (вход)
        ctx.fillStyle = '#333333';
        ctx.fillRect(-40, -3, 15, 6);

        // Стрелка направления
        ctx.fillStyle = this.direction > 0 ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        if (this.direction > 0) {
            ctx.moveTo(-35, 0);
            ctx.lineTo(-25, -5);
            ctx.lineTo(-25, 5);
        } else {
            ctx.moveTo(-25, 0);
            ctx.lineTo(-35, -5);
            ctx.lineTo(-35, 5);
        }
        ctx.closePath();
        ctx.fill();
    }

    getProperties() {
        const baseProps = super.getProperties();

        return {
            ...baseProps,
            'Тип': 'Мотор-редуктор',
            'Передаточное число': `1:${this.gearRatio}`,
            'КПД редуктора': `${Math.round(this.efficiency * 100)}%`,
            'Выходная скорость': `${Math.round(this.outputSpeed)} об/мин`,
            'Выходной момент': `${this.outputTorque.toFixed(3)} Н·м`,
            'Выходная мощность': `${this.outputPower.toFixed(2)} Вт`,
            'Макс. момент': `${this.maxTorque} Н·м`,
            'Нагрузка': `${this.loadTorque.toFixed(2)} Н·м`,
            'Люфт': `${this.backlash}°`,
            'Мех. состояние': this.broken ? 'Сломан' : (this.isStalled ? 'Заблокирован' : 'Норма')
        };
    }
}