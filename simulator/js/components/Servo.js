class Servo extends BaseComponent {
    constructor(config = {}) {
        super('servo', {
            color: '#9B59B6',
            width: 50,
            height: 40,
            ...config
        });

        this.angle = 90;           // Текущий угол (0-180)
        this.targetAngle = 90;     // Целевой угол
        this.speed = 0.5;          // Скорость движения (град/мс)
        this.minAngle = config.minAngle || 0;
        this.maxAngle = config.maxAngle || 180;
        this.voltage = config.voltage || 5;
        this.current = 0;

        // Добавляем клеммы: питание, земля, сигнал
        this.addTerminal('V+', 'power', 0, this.height/3);
        this.addTerminal('GND', 'ground', 0, this.height*2/3);
        this.addTerminal('SIG', 'signal', this.width, this.height/2);
    }

    receiveSignal(value) {
        // Преобразуем ШИМ сигнал (0-255) в угол (0-180)
        if (value >= 0 && value <= 255) {
            this.targetAngle = (value / 255) * (this.maxAngle - this.minAngle) + this.minAngle;
        } else if (value >= 0 && value <= 180) {
            // Если уже угол
            this.targetAngle = Math.max(this.minAngle, Math.min(this.maxAngle, value));
        }
    }

    update(deltaTime) {
        // Плавное движение к целевому углу
        const angleDiff = this.targetAngle - this.angle;
        if (Math.abs(angleDiff) > 0.1) {
            const step = Math.sign(angleDiff) * this.speed * deltaTime * 1000;
            if (Math.abs(step) > Math.abs(angleDiff)) {
                this.angle = this.targetAngle;
            } else {
                this.angle += step;
            }
        } else {
            this.angle = this.targetAngle;
        }

        // Потребляемый ток зависит от нагрузки
        const load = Math.abs(this.targetAngle - this.angle) / 180;
        this.current = 0.01 + load * 0.05; // 10-60mA
    }

    calculate() {
        this.power = this.current * this.voltage;
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);

        // Корпус сервопривода
        ctx.fillStyle = this.color;
        ctx.fillRect(-20, -15, 40, 30);

        // Вращающийся вал
        ctx.save();
        ctx.rotate((this.angle - 90) * Math.PI / 180);

        // Рычаг
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, -3, 25, 6);

        // Крепежное отверстие
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Шкала угла
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 25, -Math.PI/2, Math.PI/2);
        ctx.stroke();

        // Метки
        for (let i = 0; i <= 180; i += 30) {
            const angle = (i - 90) * Math.PI / 180;
            const x1 = Math.cos(angle) * 23;
            const y1 = Math.sin(angle) * 23;
            const x2 = Math.cos(angle) * 27;
            const y2 = Math.sin(angle) * 27;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            if (i % 60 === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const tx = Math.cos(angle) * 32;
                const ty = Math.sin(angle) * 32;
                ctx.fillText(i.toString(), tx, ty);
            }
        }

        // Текущий угол
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.angle)}°`, 0, 0);

        ctx.restore();
    }

    getProperties() {
        return {
            ...super.getProperties(),
            'Угол': `${Math.round(this.angle)}°`,
            'Целевой угол': `${Math.round(this.targetAngle)}°`,
            'Диапазон': `${this.minAngle}° - ${this.maxAngle}°`,
            'Ток потребления': `${(this.current * 1000).toFixed(0)}mA`
        };
    }
}