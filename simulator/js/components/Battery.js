// Класс батареи - DC источник напряжения с ограниченной емкостью
// Моделирует реальную батарею с внутренним сопротивлением и разрядкой
class Battery extends VoltageSource {
    constructor(config = {}) {
        super('battery', {
            color: '#FF9900',
            voltage: config.voltage || 9,
            ...config
        });

        this.capacity = config.capacity || 1000; // Емкость в mAh
        this.currentCapacity = this.capacity; // Текущий заряд
        this.chargeLevel = 100; // Уровень заряда в процентах
        this.isCharging = false; // Флаг зарядки

        this.minVoltage = config.minVoltage || 1.5;
        this.maxVoltage = config.maxVoltage || 12;

        // Батарея всегда DC
        this.isAC = false;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Разрядка батареи при наличии тока нагрузки
        if (this.current > 0 && this.isEnabled) {
            // Расчет разряда в mAh: I(А) * t(часы) * 1000
            const discharge = this.current * 1000 * deltaTime / 3600; // Конвертация секунд в часы
            this.currentCapacity = Math.max(0, this.currentCapacity - discharge);
            this.chargeLevel = (this.currentCapacity / this.capacity) * 100;

            // Падение напряжения при разряде (нелинейная характеристика)
            if (this.chargeLevel < 20) {
                this.outputVoltage = this.outputVoltage * (this.chargeLevel / 100);
            }

            // Полный разряд
            if (this.currentCapacity <= 0) {
                this.broken = true;
                this.isEnabled = false;
                this.outputVoltage = 0;
            }
        }

        // Зарядка (если ток отрицательный - течет в батарею)
        if (this.isCharging && this.current < 0) {
            const charge = Math.abs(this.current) * 1000 * deltaTime / 3600;
            this.currentCapacity = Math.min(this.capacity, this.currentCapacity + charge);
            this.chargeLevel = (this.currentCapacity / this.capacity) * 100;

            // Автоматическое отключение зарядки
            if (this.currentCapacity >= this.capacity * 0.9) {
                this.isCharging = false;
            }
        }
    }

    // Зарядить батарею
    recharge(amount = 100) {
        this.currentCapacity = Math.min(this.capacity, this.currentCapacity + amount);
        this.chargeLevel = (this.currentCapacity / this.capacity) * 100;

        // Восстановление после полного разряда
        if (this.currentCapacity > 0 && this.broken) {
            this.broken = false;
            this.isEnabled = true;
            this.outputVoltage = config.voltage || 9;
        }
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Индикатор уровня заряда
        const indicatorWidth = this.width - 20;
        const indicatorHeight = 4;
        const fillWidth = (this.chargeLevel / 100) * indicatorWidth;

        ctx.fillStyle = '#333333';
        ctx.fillRect(10, this.height - 8, indicatorWidth, indicatorHeight);

        // Цвет индикатора в зависимости от уровня заряда
        let chargeColor;
        if (this.chargeLevel > 70) chargeColor = '#00ff00';
        else if (this.chargeLevel > 30) chargeColor = '#ffff00';
        else chargeColor = '#ff0000';

        ctx.fillStyle = chargeColor;
        ctx.fillRect(10, this.height - 8, fillWidth, indicatorHeight);

        // Отображение процента заряда
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.chargeLevel)}%`, this.width/2, this.height - 12);

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Емкость': `${this.capacity}mAh`,
            'Текущий заряд': `${this.currentCapacity.toFixed(0)}mAh`,
            'Уровень заряда': `${Math.round(this.chargeLevel)}%`,
            'Состояние': this.broken ? '🔋 Разряжена' :
                       (this.chargeLevel > 70 ? '🔋 Полная' :
                       (this.chargeLevel > 30 ? '🔋 Средняя' : '🔋 Низкий заряд'))
        };
    }
}