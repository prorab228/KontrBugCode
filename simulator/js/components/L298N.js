class L298N extends BaseComponent {
    constructor(config = {}) {
        super('l298n', {
            color: '#34495e',
            width: 120,
            height: 80,
            ...config
        });

        // Характеристики драйвера
        this.supplyVoltage = config.supplyVoltage || 12;    // Напряжение питания двигателей
        this.logicVoltage = config.logicVoltage || 5;       // Напряжение логики
        this.maxCurrentPerChannel = config.maxCurrentPerChannel || 2; // Максимальный ток на канал (A)
        this.enablePWM = config.enablePWM !== false;        // Включить ШИМ управление

        // Состояние каналов (A и B)
        this.channels = {
            A: {
                enabled: false,
                in1: false,    // Направление 1
                in2: false,    // Направление 2
                speed: 0,      // Скорость 0-255 (для ШИМ)
                current: 0,
                motor: null    // Подключенный мотор
            },
            B: {
                enabled: false,
                in3: false,
                in4: false,
                speed: 0,
                current: 0,
                motor: null
            }
        };

        // Перегрев
        this.temperature = 25; // Температура в °C
        this.overheatThreshold = 85; // Порог перегрева

        // Терминалы L298N
        // Питание
        this.addTerminal('VCC', 'power', this.width/2, 0);           // Питание двигателей
        this.addTerminal('GND', 'ground', this.width/2, this.height); // Земля
        this.addTerminal('VSS', 'power', this.width/4, 0);           // Логическое питание (5V)

        // Управление каналом A
        this.addTerminal('IN1', 'input', 0, 15);    // Направление 1
        this.addTerminal('IN2', 'input', 0, 25);    // Направление 2
        this.addTerminal('ENA', 'input', 0, 35);    // Включение/ШИМ

        // Управление каналом B
        this.addTerminal('IN3', 'input', 0, 45);    // Направление 3
        this.addTerminal('IN4', 'input', 0, 55);    // Направление 4
        this.addTerminal('ENB', 'input', 0, 65);    // Включение/ШИМ

        // Выходы на двигатели
        this.addTerminal('OUT1', 'output', this.width, 15);  // Канал A+
        this.addTerminal('OUT2', 'output', this.width, 25);  // Канал A-
        this.addTerminal('OUT3', 'output', this.width, 45);  // Канал B+
        this.addTerminal('OUT4', 'output', this.width, 55);  // Канал B-

        // Диоды защиты (виртуальные)
        this.protectionDiodes = true;
    }

    // Подключить мотор к каналу
    connectMotor(channel, motor) {
        if (channel === 'A' || channel === 'B') {
            this.channels[channel].motor = motor;

            // Настраиваем мотор на работу с драйвером
            if (motor) {
                motor.voltage = this.supplyVoltage;
                motor.controller = this;
            }

            console.log(`Мотор подключен к каналу ${channel} драйвера L298N`);
            return true;
        }
        return false;
    }

    // Управление каналом
    setChannel(channel, in1, in2, speed = 255) {
        if (!this.channels[channel]) return;

        const chan = this.channels[channel];

        // Обновляем состояние
        chan.in1 = !!in1;
        chan.in2 = !!in2;
        chan.speed = Math.max(0, Math.min(255, speed));
        chan.enabled = speed > 0;

        // Управляем подключенным мотором
        if (chan.motor) {
            // Определяем направление
            if (chan.in1 && !chan.in2) {
                chan.motor.direction = 1; // Вперед
            } else if (!chan.in1 && chan.in2) {
                chan.motor.direction = -1; // Назад
            } else {
                chan.motor.direction = 0; // Стоп или торможение
            }

            // Устанавливаем скорость (0-100%)
            chan.motor.speed = (chan.speed / 255) * 100;

            // Обновляем ток мотора
            chan.current = chan.motor.current || 0;
        }

        // Обновляем температуру (нагрев от работы)
        this.updateTemperature();
    }

    // Быстрые команды
    forward(channel, speed = 255) {
        if (channel === 'A') {
            this.setChannel('A', true, false, speed);
        } else {
            this.setChannel('B', true, false, speed);
        }
    }

    backward(channel, speed = 255) {
        if (channel === 'A') {
            this.setChannel('A', false, true, speed);
        } else {
            this.setChannel('B', false, true, speed);
        }
    }

    stop(channel) {
        if (channel === 'A') {
            this.setChannel('A', false, false, 0);
        } else {
            this.setChannel('B', false, false, 0);
        }
    }

    brake(channel) {
        if (channel === 'A') {
            this.setChannel('A', true, true, 0); // Короткое замыкание для торможения
        } else {
            this.setChannel('B', true, true, 0);
        }
    }

    update() {
        // Рассчитываем общий потребляемый ток
        const totalCurrent = this.channels.A.current + this.channels.B.current;
        this.current = totalCurrent;

        // Рассчитываем мощность
        this.power = this.current * this.supplyVoltage;

        // Проверка на перегрузку
        if (this.current > this.maxCurrentPerChannel * 2) {
            this.overheat = true;
            this.temperature += 0.1; // Быстрый нагрев
        } else if (this.current > 0) {
            this.temperature += 0.01; // Медленный нагрев
        } else {
            this.temperature = Math.max(25, this.temperature - 0.05); // Охлаждение
        }

        // Проверка перегрева
        if (this.temperature > this.overheatThreshold) {
            this.overheat = true;

            // При сильном перегреве отключаем каналы
            if (this.temperature > this.overheatThreshold + 20) {
                this.stop('A');
                this.stop('B');
                this.broken = true;
            }
        } else {
            this.overheat = false;
        }

        // Обновляем выходное напряжение на терминалах
        this.updateOutputVoltages();
    }

    updateOutputVoltages() {
        // Устанавливаем напряжения на выходных терминалах в зависимости от состояния каналов

        // Канал A
        if (this.channels.A.enabled) {
            const outputVoltage = (this.channels.A.speed / 255) * this.supplyVoltage;

            // OUT1 и OUT2 в зависимости от направления
            if (this.channels.A.in1 && !this.channels.A.in2) {
                // Вперед
                this.setTerminalVoltage('OUT1', outputVoltage);
                this.setTerminalVoltage('OUT2', 0);
            } else if (!this.channels.A.in1 && this.channels.A.in2) {
                // Назад
                this.setTerminalVoltage('OUT1', 0);
                this.setTerminalVoltage('OUT2', outputVoltage);
            } else if (this.channels.A.in1 && this.channels.A.in2) {
                // Торможение
                this.setTerminalVoltage('OUT1', this.supplyVoltage);
                this.setTerminalVoltage('OUT2', this.supplyVoltage);
            } else {
                // Стоп
                this.setTerminalVoltage('OUT1', 0);
                this.setTerminalVoltage('OUT2', 0);
            }
        } else {
            this.setTerminalVoltage('OUT1', 0);
            this.setTerminalVoltage('OUT2', 0);
        }

        // Канал B (аналогично)
        if (this.channels.B.enabled) {
            const outputVoltage = (this.channels.B.speed / 255) * this.supplyVoltage;

            if (this.channels.B.in3 && !this.channels.B.in4) {
                this.setTerminalVoltage('OUT3', outputVoltage);
                this.setTerminalVoltage('OUT4', 0);
            } else if (!this.channels.B.in3 && this.channels.B.in4) {
                this.setTerminalVoltage('OUT3', 0);
                this.setTerminalVoltage('OUT4', outputVoltage);
            } else if (this.channels.B.in3 && this.channels.B.in4) {
                this.setTerminalVoltage('OUT3', this.supplyVoltage);
                this.setTerminalVoltage('OUT4', this.supplyVoltage);
            } else {
                this.setTerminalVoltage('OUT3', 0);
                this.setTerminalVoltage('OUT4', 0);
            }
        } else {
            this.setTerminalVoltage('OUT3', 0);
            this.setTerminalVoltage('OUT4', 0);
        }
    }

    setTerminalVoltage(terminalName, voltage) {
        const terminal = this.terminals.find(t => t.name === terminalName);
        if (terminal) {
            terminal.voltage = voltage;
        }
    }

    updateTemperature() {
        // Обновление температуры на основе тока и состояния
        const powerLoss = this.power * 0.1; // 10% потерь на тепло
        this.temperature = Math.min(100, 25 + powerLoss * 2);
    }

    checkShortCircuit() {
        // Проверка на внутреннее короткое замыкание драйвера
        if (this.broken) return true;

        // Проверка на одновременное включение обоих входов канала (торможение - нормально)
        // Проверка на превышение напряжения
        if (this.supplyVoltage > 36) { // Максимум для L298N
            return true;
        }

        return false;
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Корпус микросхемы
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, this.width, this.height);

        // Обозначение
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('L298N', this.width/2, this.height/2);
        ctx.font = '10px Arial';
        ctx.fillText('DRIVER', this.width/2, this.height/2 + 15);

        // Индикаторы каналов
        this.drawChannelIndicator(ctx, 'A', 10, 20);
        this.drawChannelIndicator(ctx, 'B', 10, 50);

        // Индикатор температуры
        this.drawTemperatureIndicator(ctx);

        // Радиатор (условное изображение)
        ctx.fillStyle = '#666666';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(this.width - 20, 5 + i * 15, 15, 8);
        }

        ctx.restore();
    }

    drawChannelIndicator(ctx, channel, x, y) {
        const chan = this.channels[channel];

        // Фон индикатора
        ctx.fillStyle = chan.enabled ? '#2ecc71' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Направление
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let directionSymbol = '●';
        if (chan.in1 && !chan.in2) directionSymbol = '→';
        if (!chan.in1 && chan.in2) directionSymbol = '←';
        if (chan.in1 && chan.in2) directionSymbol = '■';

        ctx.fillText(directionSymbol, x, y);

        // Скорость
        ctx.font = '7px Arial';
        ctx.fillText(`${Math.round(chan.speed/2.55)}%`, x + 15, y);

        // Ток
        ctx.fillText(`${chan.current.toFixed(2)}A`, x + 35, y);
    }

    drawTemperatureIndicator(ctx) {
        const tempX = this.width - 40;
        const tempY = this.height - 20;
        const tempWidth = 30;
        const tempHeight = 10;

        // Шкала температуры
        const tempPercent = (this.temperature - 25) / (100 - 25);
        const fillWidth = tempWidth * Math.min(1, Math.max(0, tempPercent));

        // Фон
        ctx.fillStyle = '#333333';
        ctx.fillRect(tempX, tempY, tempWidth, tempHeight);

        // Заполнение (цвет в зависимости от температуры)
        let tempColor;
        if (this.temperature < 60) {
            tempColor = '#2ecc71'; // Зеленый
        } else if (this.temperature < 80) {
            tempColor = '#f39c12'; // Желтый
        } else {
            tempColor = '#e74c3c'; // Красный
        }

        ctx.fillStyle = tempColor;
        ctx.fillRect(tempX, tempY, fillWidth, tempHeight);

        // Граница
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(tempX, tempY, tempWidth, tempHeight);

        // Текст температуры
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(this.temperature)}°C`, tempX, tempY - 5);
    }

    getProperties() {
        return {
            ...super.getProperties(),
            'Напряжение питания': `${this.supplyVoltage}V`,
            'Логическое напряжение': `${this.logicVoltage}V`,
            'Макс. ток на канал': `${this.maxCurrentPerChannel}A`,
            'Температура': `${Math.round(this.temperature)}°C`,
            'Канал A': this.channels.A.enabled ?
                `Вкл (${this.channels.A.in1 ? 'H' : 'L'},${this.channels.A.in2 ? 'H' : 'L'}, ${Math.round(this.channels.A.speed/2.55)}%)` : 'Выкл',
            'Канал B': this.channels.B.enabled ?
                `Вкл (${this.channels.B.in3 ? 'H' : 'L'},${this.channels.B.in4 ? 'H' : 'L'}, ${Math.round(this.channels.B.speed/2.55)}%)` : 'Выкл',
            'Ток канала A': `${this.channels.A.current.toFixed(2)}A`,
            'Ток канала B': `${this.channels.B.current.toFixed(2)}A`,
            'Состояние': this.broken ? 'Сгорел' : (this.overheat ? 'Перегрев' : 'Норма')
        };
    }
}