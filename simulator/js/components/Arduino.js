class Arduino extends BaseComponent {
    constructor(config = {}) {
        super('arduino', {
            color: '#2c3e50',
            width: 120,
            height: 80,
            ...config
        });

        // Конфигурация платы
        this.boardType = config.boardType || 'uno';
        this.boardConfigs = {
            'uno': {
                width: 400,
                height: 400,
                pins: this.getUnoPins(),
                name: 'Arduino Uno',
                voltage: 5,
                maxCurrent: 0.5
            },
            'nano': {
                width: 200,
                height: 300,
                pins: this.getNanoPins(),
                name: 'Arduino Nano',
                voltage: 5,
                maxCurrent: 0.2
            },
            'mega': {
                width: 450,
                height: 400,
                pins: this.getMegaPins(),
                name: 'Arduino Mega',
                voltage: 5,
                maxCurrent: 1.0
            },
            'zero': {
                width: 400,
                height: 400,
                pins: this.getZeroPins(),
                name: 'ContrBug Zero',
                voltage: 3.3,
                maxCurrent: 0.3
            }
        };

        const boardConfig = this.boardConfigs[this.boardType] || this.boardConfigs.uno;

        // Размеры платы
        this.width = boardConfig.width;
        this.height = boardConfig.height;
        this.boardVoltage = boardConfig.voltage;
        this.maxCurrent = boardConfig.maxCurrent;

        // Состояние платы
        this.isPowered = false;
        this.powerConsumption = 0;
        this.temperature = 20;
        this.ledState = { power: false, builtin: false };

        // Программирование
        this.code = config.code || '';
        this.isRunning = false;
        this.serialOutput = [];
        this.lastExecutionTime = 0;

        // Пины
        this.pins = [];
        this.createPins(boardConfig.pins);

        // Загрузка изображения
        this.boardImage = null;
        this.imageLoaded = false;
        this.loadBoardImage();

        // Таймеры
        this.powerLedTimer = 0;
        this.executionTimer = 0;
    }

    createPins(pinConfigs) {
        this.pins = pinConfigs.map(config => ({
            number: config.number,
            type: config.type,
            mode: config.mode || 'input', // input, output, pwm, analog
            value: config.value || 0,
            voltage: 0,
            current: 0,
            pwm: config.pwm || false,
            analog: config.analog || false,
            relX: config.relX,
            relY: config.relY,
            connected: false,
            wire: null
        }));

        // Создаем терминалы для каждого пина
        this.pins.forEach(pin => {
            this.addTerminal(
                pin.number,
                pin.type,
                pin.relX * this.width,
                pin.relY * this.height
            );
        });
    }

    // Конфигурации пинов для разных плат
    getUnoPins() {
        return [
            // Левый ряд (цифровые)
            { number: 'D0', type: 'digital', relX: 0.05, relY: 0.1 },
            { number: 'D1', type: 'digital', relX: 0.05, relY: 0.15 },
            { number: 'D2', type: 'digital', relX: 0.05, relY: 0.2 },
            { number: 'D3', type: 'digital', pwm: true, relX: 0.05, relY: 0.25 },
            { number: 'D4', type: 'digital', relX: 0.05, relY: 0.3 },
            { number: 'D5', type: 'digital', pwm: true, relX: 0.05, relY: 0.35 },
            { number: 'D6', type: 'digital', pwm: true, relX: 0.05, relY: 0.4 },
            { number: 'D7', type: 'digital', relX: 0.05, relY: 0.45 },
            { number: 'D8', type: 'digital', relX: 0.05, relY: 0.5 },
            { number: 'D9', type: 'digital', pwm: true, relX: 0.05, relY: 0.55 },
            { number: 'D10', type: 'digital', pwm: true, relX: 0.05, relY: 0.6 },
            { number: 'D11', type: 'digital', pwm: true, relX: 0.05, relY: 0.65 },
            { number: 'D12', type: 'digital', relX: 0.05, relY: 0.7 },
            { number: 'D13', type: 'digital', relX: 0.05, relY: 0.75 },

            // Правый ряд (питание и аналоговые)
            { number: 'GND', type: 'ground', relX: 0.95, relY: 0.1 },
            { number: '5V', type: 'power', relX: 0.95, relY: 0.15 },
            { number: '3.3V', type: 'power', relX: 0.95, relY: 0.2 },
            { number: 'VIN', type: 'power', relX: 0.95, relY: 0.25 },
            { number: 'A0', type: 'analog', relX: 0.95, relY: 0.35 },
            { number: 'A1', type: 'analog', relX: 0.95, relY: 0.4 },
            { number: 'A2', type: 'analog', relX: 0.95, relY: 0.45 },
            { number: 'A3', type: 'analog', relX: 0.95, relY: 0.5 },
            { number: 'A4', type: 'analog', relX: 0.95, relY: 0.55 },
            { number: 'A5', type: 'analog', relX: 0.95, relY: 0.6 }
        ];
    }

    getNanoPins() {
        return [
            // Левая сторона
            { number: 'D0', type: 'digital', relX: 0.05, relY: 0.1 },
            { number: 'D1', type: 'digital', relX: 0.05, relY: 0.15 },
            { number: 'D2', type: 'digital', relX: 0.05, relY: 0.2 },
            { number: 'D3', type: 'digital', pwm: true, relX: 0.05, relY: 0.25 },
            { number: 'D4', type: 'digital', relX: 0.05, relY: 0.3 },
            { number: 'D5', type: 'digital', pwm: true, relX: 0.05, relY: 0.35 },
            { number: 'D6', type: 'digital', pwm: true, relX: 0.05, relY: 0.4 },
            { number: 'D7', type: 'digital', relX: 0.05, relY: 0.45 },
            { number: 'D8', type: 'digital', relX: 0.05, relY: 0.5 },
            { number: 'D9', type: 'digital', pwm: true, relX: 0.05, relY: 0.55 },
            { number: 'D10', type: 'digital', pwm: true, relX: 0.05, relY: 0.6 },
            { number: 'D11', type: 'digital', pwm: true, relX: 0.05, relY: 0.65 },
            { number: 'D12', type: 'digital', relX: 0.05, relY: 0.7 },
            { number: 'D13', type: 'digital', relX: 0.05, relY: 0.75 },

            // Правая сторона
            { number: 'GND', type: 'ground', relX: 0.95, relY: 0.1 },
            { number: 'RST', type: 'digital', relX: 0.95, relY: 0.15 },
            { number: '5V', type: 'power', relX: 0.95, relY: 0.2 },
            { number: '3.3V', type: 'power', relX: 0.95, relY: 0.25 },
            { number: 'A0', type: 'analog', relX: 0.95, relY: 0.35 },
            { number: 'A1', type: 'analog', relX: 0.95, relY: 0.4 },
            { number: 'A2', type: 'analog', relX: 0.95, relY: 0.45 },
            { number: 'A3', type: 'analog', relX: 0.95, relY: 0.5 },
            { number: 'A4', type: 'analog', relX: 0.95, relY: 0.55 },
            { number: 'A5', type: 'analog', relX: 0.95, relY: 0.6 },
            { number: 'A6', type: 'analog', relX: 0.95, relY: 0.65 },
            { number: 'A7', type: 'analog', relX: 0.95, relY: 0.7 }
        ];
    }

    getMegaPins() {
        return [
            // Левый ряд (только часть пинов для примера)
            { number: 'D0', type: 'digital', relX: 0.05, relY: 0.05 },
            { number: 'D1', type: 'digital', relX: 0.05, relY: 0.07 },
            { number: 'D2', type: 'digital', relX: 0.05, relY: 0.09 },
            { number: 'D3', type: 'digital', pwm: true, relX: 0.05, relY: 0.11 },
            { number: 'D4', type: 'digital', relX: 0.05, relY: 0.13 },
            { number: 'D5', type: 'digital', pwm: true, relX: 0.05, relY: 0.15 },

            // Правый ряд
            { number: '5V', type: 'power', relX: 0.95, relY: 0.05 },
            { number: '3.3V', type: 'power', relX: 0.95, relY: 0.07 },
            { number: 'GND', type: 'ground', relX: 0.95, relY: 0.09 },
            { number: 'VIN', type: 'power', relX: 0.95, relY: 0.11 },
            { number: 'A0', type: 'analog', relX: 0.95, relY: 0.15 },
            { number: 'A1', type: 'analog', relX: 0.95, relY: 0.17 }
        ];
    }

    getZeroPins() {
        return [
            { number: 'D2', type: 'digital', relX: 0.385, relY: 0.66 },
            { number: 'D4', type: 'digital', relX: 0.385, relY: 0.69 },
            { number: 'D5', type: 'digital', pwm: true, relX: 0.385, relY: 0.72 },
            { number: 'D6', type: 'digital', pwm: true, relX: 0.385, relY: 0.75 },
            { number: 'D7', type: 'digital', relX: 0.385, relY: 0.78 },
            { number: 'D8', type: 'digital', relX: 0.385, relY: 0.81 },
            { number: 'D12', type: 'digital', relX: 0.385, relY: 0.84 },
            { number: 'D13', type: 'digital', relX: 0.385, relY: 0.87 },

            { number: 'GND', type: 'ground', relX: 0.325, relY: 0.66 },
            { number: '5V', type: 'power', relX: 0.355, relY: 0.66 },
            { number: 'GND', type: 'ground', relX: 0.325, relY: 0.69 },
            { number: '5V', type: 'power', relX: 0.355, relY: 0.69 },
            { number: 'GND', type: 'ground', relX: 0.325, relY: 0.72 },
            { number: '5V', type: 'power', relX: 0.355, relY: 0.72 }
        ];
    }

    loadBoardImage() {
        const imageUrl = `images/boards/${this.boardType}.png`;
        this.boardImage = new Image();
        this.boardImage.onload = () => {
            this.imageLoaded = true;
        };
        this.boardImage.onerror = () => {
            console.warn(`Не удалось загрузить изображение для ${this.boardType}`);
            this.imageLoaded = false;
        };
        this.boardImage.src = imageUrl;
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Проверяем питание платы
        this.checkPower();

        // Обновляем состояние пинов
        this.updatePins();

        // Мигание светодиодов
        this.powerLedTimer += deltaTime;
        if (this.powerLedTimer > 0.5) {
            this.ledState.power = !this.ledState.power;
            this.powerLedTimer = 0;
        }

        // Выполнение кода если плата включена и запущена
        if (this.isPowered && this.isRunning) {
            this.executionTimer += deltaTime;
            if (this.executionTimer > 0.1) { // 10 раз в секунду
                this.executeCode();
                this.executionTimer = 0;
            }
        }

        // Расчет потребляемой мощности
        this.calculatePowerConsumption();

        // Нагрев платы
        this.temperature = 20 + this.powerConsumption * 10;
        if (this.temperature > 60) {
            this.overheat = true;
            if (this.temperature > 85) {
                this.broken = true;
                this.isPowered = false;
                this.isRunning = false;
            }
        }
    }

    checkPower() {
        // Проверяем, подано ли питание на VIN или USB
        const vinPin = this.terminals.find(t => t.name === 'VIN');
        const usbPower = false; // Упрощенно

        this.isPowered = (vinPin && vinPin.voltage > 7) || usbPower;

        // Устанавливаем напряжения на пинах питания
        if (this.isPowered) {
            const v5 = this.terminals.find(t => t.name === '5V');
            const v33 = this.terminals.find(t => t.name === '3.3V');
            const gnd = this.terminals.find(t => t.name === 'GND');

            if (v5) v5.voltage = 5;
            if (v33) v33.voltage = 3.3;
            if (gnd) gnd.voltage = 0;
        }
    }

    updatePins() {
        // Обновляем состояния пинов на основе их режимов и подключений
        this.pins.forEach(pin => {
            const terminal = this.terminals.find(t => t.name === pin.number);
            if (!terminal) return;

            if (pin.mode === 'input' || pin.mode === 'analog') {
                // Для входов читаем напряжение с терминала
                pin.voltage = terminal.voltage || 0;

                // Конвертируем в цифровое значение
                if (pin.type === 'digital') {
                    pin.value = pin.voltage > 2.5 ? 1 : 0;
                } else if (pin.type === 'analog') {
                    // АЦП: 0-5V -> 0-1023
                    pin.value = Math.min(1023, Math.max(0, Math.round((pin.voltage / 5) * 1023)));
                }
            } else if (pin.mode === 'output' || pin.mode === 'pwm') {
                // Для выходов устанавливаем напряжение на терминале
                if (pin.type === 'digital') {
                    terminal.voltage = pin.value ? this.boardVoltage : 0;
                } else if (pin.type === 'pwm') {
                    // ШИМ: значение 0-255 -> напряжение 0-5V
                    terminal.voltage = (pin.value / 255) * this.boardVoltage;
                }
            }

            // Расчет тока через пин
            if (terminal.connected && terminal.wire) {
                const otherComponent = terminal.wire.getOtherComponent(this);
                if (otherComponent && otherComponent.resistance > 0) {
                    pin.current = terminal.voltage / otherComponent.resistance;
                }
            }
        });
    }

    calculatePowerConsumption() {
        this.powerConsumption = 0;

        // Потребление от пинов
        this.pins.forEach(pin => {
            if (pin.mode === 'output' && pin.value) {
                this.powerConsumption += Math.pow(pin.current, 2) * 100; // Упрощенно
            }
        });

        // Собственное потребление платы
        if (this.isPowered) {
            this.powerConsumption += 0.05; // 50mW в простое
            if (this.isRunning) {
                this.powerConsumption += 0.1; // +100mW при работе
            }
        }

        this.power = this.powerConsumption;
        this.current = this.powerConsumption / this.boardVoltage;
    }

    // Программирование Arduino
    digitalWrite(pinNumber, value) {
        const pin = this.pins.find(p => p.number === pinNumber);
        if (pin && (pin.mode === 'output' || pin.mode === 'pwm')) {
            pin.value = value ? 1 : 0;
            this.serialPrint(`digitalWrite(${pinNumber}, ${value ? 'HIGH' : 'LOW'})`);
        }
    }

    analogWrite(pinNumber, value) {
        const pin = this.pins.find(p => p.number === pinNumber && p.pwm);
        if (pin) {
            pin.value = Math.max(0, Math.min(255, value));
            this.serialPrint(`analogWrite(${pinNumber}, ${value})`);
        }
    }

    digitalRead(pinNumber) {
        const pin = this.pins.find(p => p.number === pinNumber);
        if (pin) {
            const value = pin.value || 0;
            this.serialPrint(`digitalRead(${pinNumber}) = ${value ? 'HIGH' : 'LOW'}`);
            return value;
        }
        return 0;
    }

    analogRead(pinNumber) {
        const pin = this.pins.find(p => p.number === pinNumber && p.type === 'analog');
        if (pin) {
            const value = pin.value || 0;
            this.serialPrint(`analogRead(${pinNumber}) = ${value}`);
            return value;
        }
        return 0;
    }

    executeCode() {
        if (!this.code) return;

        try {
            // Простая интерпретация кода Arduino
            const lines = this.code.split('\n');
            for (const line of lines) {
                this.executeLine(line.trim());
            }
        } catch (error) {
            this.serialPrint(`Ошибка: ${error.message}`);
        }
    }

    executeLine(line) {
        if (line.startsWith('digitalWrite(')) {
            const match = line.match(/digitalWrite\((\w+),\s*(\w+)\)/);
            if (match) {
                const pin = match[1];
                const value = match[2] === 'HIGH' ? 1 : 0;
                this.digitalWrite(pin, value);
            }
        } else if (line.startsWith('analogWrite(')) {
            const match = line.match(/analogWrite\((\w+),\s*(\d+)\)/);
            if (match) {
                const pin = match[1];
                const value = parseInt(match[2]);
                this.analogWrite(pin, value);
            }
        } else if (line.startsWith('digitalRead(')) {
            const match = line.match(/digitalRead\((\w+)\)/);
            if (match) {
                const pin = match[1];
                this.digitalRead(pin);
            }
        } else if (line.startsWith('analogRead(')) {
            const match = line.match(/analogRead\((\w+)\)/);
            if (match) {
                const pin = match[1];
                this.analogRead(pin);
            }
        } else if (line.startsWith('Serial.print')) {
            const match = line.match(/Serial\.print(?:ln)?\(["']?([^"']+)["']?\)/);
            if (match) {
                this.serialPrint(match[1]);
            }
        } else if (line.includes('pinMode')) {
            const match = line.match(/pinMode\((\w+),\s*(\w+)\)/);
            if (match) {
                const pin = match[1];
                const mode = match[2];
                this.setPinMode(pin, mode);
            }
        }
    }

    setPinMode(pinNumber, mode) {
        const pin = this.pins.find(p => p.number === pinNumber);
        if (pin) {
            pin.mode = mode.toLowerCase();
            this.serialPrint(`pinMode(${pinNumber}, ${mode})`);
        }
    }

    serialPrint(message) {
        this.serialOutput.push(`[${new Date().toLocaleTimeString()}] ${message}`);
        if (this.serialOutput.length > 50) {
            this.serialOutput.shift();
        }
    }

    runCode(code = null) {
        if (code) this.code = code;

        if (!this.isPowered) {
            this.serialPrint('Ошибка: плата не включена');
            return;
        }

        this.isRunning = true;
        this.serialOutput = [];
        this.serialPrint('=== Запуск программы ===');
        this.serialPrint(`Плата: ${this.boardConfigs[this.boardType].name}`);
    }

    stopCode() {
        this.isRunning = false;
        this.serialPrint('=== Остановка программы ===');
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Рисуем изображение платы или запасной вариант
        if (this.imageLoaded && this.boardImage) {
            ctx.drawImage(this.boardImage, 0, 0, this.width, this.height);
        } else {
            this.drawFallbackBoard(ctx);
        }

        // Светодиод питания
        if (this.isPowered) {
            ctx.fillStyle = this.ledState.power ? '#00ff00' : '#004400';
            ctx.beginPath();
            ctx.arc(this.width * 0.9, this.height * 0.1, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Встроенный светодиод (D13)
        const d13Pin = this.pins.find(p => p.number === 'D13');
        if (d13Pin) {
            ctx.fillStyle = d13Pin.value ? '#ff00ff' : '#000000';
            ctx.beginPath();
            ctx.arc(this.width * 0.8, this.height * 0.1, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawFallbackBoard(ctx) {
        // Корпус платы
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, this.width, this.height);

        // USB разъем
        ctx.fillStyle = '#333333';
        ctx.fillRect(10, 5, 20, 8);

        // Кристалл/микроконтроллер
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.width/2 - 15, this.height/2 - 10, 30, 20);

        // Надпись
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ARDUINO', this.width/2, 20);
        ctx.font = '10px Arial';
        ctx.fillText(this.boardType.toUpperCase(), this.width/2, 35);

        // Контакты
        ctx.fillStyle = '#006400';
        this.terminals.forEach(terminal => {
            const x = terminal.x - this.x;
            const y = terminal.y - this.y;
            ctx.fillRect(x - 2, y - 2, 4, 4);

            // Номер пина
            if (this.selected) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(terminal.name, x, y - 6);
                ctx.fillStyle = '#006400';
            }
        });
    }

    getProperties() {
        const baseProps = super.getProperties();
        const digitalPins = this.pins.filter(p => p.type === 'digital');
        const analogPins = this.pins.filter(p => p.type === 'analog');
        const powerPins = this.pins.filter(p => p.type === 'power' || p.type === 'ground');

        return {
            ...baseProps,
            'Тип платы': this.boardConfigs[this.boardType].name,
            'Питание': this.isPowered ? '🟢 Включена' : '🔴 Выключена',
            'Программа': this.isRunning ? '🟢 Выполняется' : '⚫ Остановлена',
            'Напряжение': `${this.boardVoltage}V`,
            'Пины': `${this.pins.length} всего`,
            'Цифровые': `${digitalPins.length} (${digitalPins.filter(p => p.pwm).length} PWM)`,
            'Аналоговые': `${analogPins.length} входов`,
            'Питание': `${powerPins.length} пинов`,
            'Потребление': `${this.powerConsumption.toFixed(2)}W`,
            'Температура': `${this.temperature.toFixed(1)}°C`,
            'Размеры': `${this.width}×${this.height}px`
        };
    }

    getEditableProperties() {
        return {
            boardType: {
                type: 'select',
                label: 'Тип платы',
                options: [
                    { value: 'uno', label: 'Arduino Uno' },
                    { value: 'nano', label: 'Arduino Nano' },
                    { value: 'mega', label: 'Arduino Mega' },
                    { value: 'zero', label: 'ContrBug Zero' }
                ],
                value: this.boardType,
                onChange: (value) => {
                    this.setBoardType(value);
                }
            },
            code: {
                type: 'textarea',
                label: 'Код Arduino',
                value: this.code || this.getDefaultCode(),
                rows: 10,
                placeholder: 'Введите код Arduino...',
                onChange: (value) => {
                    this.code = value;
                }
            }
        };
    }

    setBoardType(type) {
        if (this.boardConfigs[type]) {
            const oldType = this.boardType;
            this.boardType = type;

            const config = this.boardConfigs[type];
            this.width = config.width;
            this.height = config.height;
            this.boardVoltage = config.voltage;
            this.maxCurrent = config.maxCurrent;

            // Пересоздаем пины
            this.pins = [];
            this.terminals = [];
            this.createPins(config.pins);

            // Перезагружаем изображение
            this.loadBoardImage();

            console.log(`Тип платы изменен с ${oldType} на ${type}`);
        }
    }

    getDefaultCode() {
        return `void setup() {
  pinMode(13, OUTPUT);  // Встроенный светодиод
  pinMode(9, OUTPUT);   // PWM пин
  Serial.begin(9600);   // Инициализация Serial
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);

  // Пример с аналоговым чтением
  int sensorValue = analogRead(A0);
  Serial.print("A0: ");
  Serial.println(sensorValue);
}`;
    }

    openCodeEditor() {
        // Создание модального окна редактора кода
        // (реализация аналогична предыдущей версии)
        console.log('Открытие редактора кода...');
    }
}