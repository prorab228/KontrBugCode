class Switch extends BaseComponent {
    constructor(config = {}) {
        super('switch', {
            color: '#666666',
            width: 40,
            height: 60,
            resistance: config.resistance || 0.01,
            ...config
        });

        this.isClosed = config.isClosed || false;
        this.switchType = config.type || 'spst'; // SPST, SPDT, DPST, DPDT
        this.contactResistance = config.contactResistance || 0.01; // Сопротивление контактов
        this.breakdownVoltage = config.breakdownVoltage || 250; // Напряжение пробоя

        // Анимация
        this.leverPosition = this.isClosed ? 1 : 0;
        this.leverTarget = this.isClosed ? 1 : 0;
        this.animationSpeed = 5;

        // Для многопозиционных переключателей
        this.positions = config.positions || 2;
        this.currentPosition = config.currentPosition || 0;

        // Создаем терминалы в зависимости от типа
        this.createTerminals();

        // Начальное состояние сопротивления
        this.updateResistance();
    }

    createTerminals() {
        switch(this.switchType) {
            case 'spst':
                // Single Pole Single Throw
                this.addTerminal('IN', 'terminal', 0, this.height/2);
                this.addTerminal('OUT', 'terminal', this.width, this.height/2);
                break;
            case 'spdt':
                // Single Pole Double Throw
                this.addTerminal('COM', 'terminal', 0, this.height/2);
                this.addTerminal('NO', 'terminal', this.width, this.height/3);
                this.addTerminal('NC', 'terminal', this.width, 2*this.height/3);
                break;
            case 'dpst':
                // Double Pole Single Throw
                this.addTerminal('IN1', 'terminal', 0, this.height/3);
                this.addTerminal('OUT1', 'terminal', this.width, this.height/3);
                this.addTerminal('IN2', 'terminal', 0, 2*this.height/3);
                this.addTerminal('OUT2', 'terminal', this.width, 2*this.height/3);
                break;
            case 'dpdt':
                // Double Pole Double Throw
                this.addTerminal('COM1', 'terminal', 0, this.height/3);
                this.addTerminal('NO1', 'terminal', this.width, this.height/4);
                this.addTerminal('NC1', 'terminal', this.width, 2*this.height/4);
                this.addTerminal('COM2', 'terminal', 0, 2*this.height/3);
                this.addTerminal('NO2', 'terminal', this.width, 3*this.height/4);
                this.addTerminal('NC2', 'terminal', this.width, 4*this.height/4);
                break;
            default:
                // По умолчанию SPST
                this.addTerminal('IN', 'terminal', 0, this.height/2);
                this.addTerminal('OUT', 'terminal', this.width, this.height/2);
        }
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Плавная анимация рычага
        if (Math.abs(this.leverPosition - this.leverTarget) > 0.01) {
            this.leverPosition += (this.leverTarget - this.leverPosition) * this.animationSpeed * deltaTime;
        } else {
            this.leverPosition = this.leverTarget;
        }

        // Обновляем сопротивления в зависимости от состояния
        this.updateResistance();

        // Обрабатываем передачу напряжения
        this.processVoltageTransfer();

        // Проверка на пробой (если переключатель разомкнут, но напряжение слишком высокое)
        if (!this.isClosed) {
            this.checkBreakdown();
        }

        // Расчет тока и мощности
        this.calculateCurrents();
    }

    updateResistance() {
        if (this.isClosed) {
            this.resistance = this.contactResistance; // Малое сопротивление
        } else {
            this.resistance = 1000000; // Высокое сопротивление (разомкнуто)
        }
    }

    processVoltageTransfer() {
        switch(this.switchType) {
            case 'spst':
                if (this.isClosed) {
                    const inTerminal = this.terminals.find(t => t.name === 'IN');
                    const outTerminal = this.terminals.find(t => t.name === 'OUT');
                    if (inTerminal && outTerminal) {
                        // Передаем напряжение с учетом падения на контактах
                        outTerminal.voltage = inTerminal.voltage || 0;
                        if (this.isAC) {
                            outTerminal.voltageAC = inTerminal.voltageAC || 0;
                        }
                    }
                }
                break;
            case 'spdt':
                const comTerminal = this.terminals.find(t => t.name === 'COM');
                const noTerminal = this.terminals.find(t => t.name === 'NO');
                const ncTerminal = this.terminals.find(t => t.name === 'NC');

                if (comTerminal) {
                    if (this.isClosed) {
                        // Замкнут на NO
                        if (noTerminal) {
                            noTerminal.voltage = comTerminal.voltage || 0;
                            if (this.isAC) {
                                noTerminal.voltageAC = comTerminal.voltageAC || 0;
                            }
                            if (ncTerminal) {
                                ncTerminal.voltage = 0;
                                ncTerminal.voltageAC = 0;
                            }
                        }
                    } else {
                        // Замкнут на NC
                        if (ncTerminal) {
                            ncTerminal.voltage = comTerminal.voltage || 0;
                            if (this.isAC) {
                                ncTerminal.voltageAC = comTerminal.voltageAC || 0;
                            }
                            if (noTerminal) {
                                noTerminal.voltage = 0;
                                noTerminal.voltageAC = 0;
                            }
                        }
                    }
                }
                break;
            // Для других типов аналогично
        }
    }

    checkBreakdown() {
        // Проверка напряжения пробоя
        let maxVoltage = 0;

        this.terminals.forEach(terminal => {
            const voltage = Math.max(terminal.voltage || 0, terminal.voltageAC || 0);
            maxVoltage = Math.max(maxVoltage, voltage);
        });

        if (maxVoltage > this.breakdownVoltage) {
            // Пробой изоляции - переключатель замыкается
            this.isClosed = true;
            this.leverTarget = 1;
            this.overheat = true;

            // Искра при пробое
            setTimeout(() => {
                this.overheat = false;
            }, 100);
        }
    }

    calculateCurrents() {
        // Расчет тока через замкнутые контакты
        if (this.isClosed && this.resistance > 0) {
            // Находим разницу напряжений между подключенными терминалами
            let voltageDiff = 0;

            if (this.switchType === 'spst') {
                const inTerminal = this.terminals.find(t => t.name === 'IN');
                const outTerminal = this.terminals.find(t => t.name === 'OUT');
                if (inTerminal && outTerminal) {
                    voltageDiff = Math.abs(
                        (inTerminal.voltage || 0) - (outTerminal.voltage || 0)
                    );
                }
            }

            if (voltageDiff > 0) {
                this.current = voltageDiff / this.resistance;
                this.power = Math.pow(this.current, 2) * this.resistance;
            } else {
                this.current = 0;
                this.power = 0;
            }
        } else {
            this.current = 0;
            this.power = 0;
        }

        // Проверка на перегрев контактов
        if (this.power > 0.1) { // 100mW может нагревать контакты
            this.overheat = true;
        }
    }

    toggle() {
        this.isClosed = !this.isClosed;
        this.leverTarget = this.isClosed ? 1 : 0;

        // Звук щелчка
        if (window.simulator && window.simulator.isRunning) {
            this.playClickSound();
        }

        console.log(`${this.name}: ${this.isClosed ? 'ЗАМКНУТ' : 'РАЗОМКНУТ'}`);
    }

    playClickSound() {
        // Простая симуляция звука щелчка
        if (typeof AudioContext !== 'undefined') {
            try {
                const audioContext = new (AudioContext || webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
            } catch (e) {
                // Игнорируем ошибки
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Основа переключателя
        ctx.fillStyle = this.overheat ? '#ff4444' : this.color;
        ctx.fillRect(0, 0, this.width, this.height);

        // Рычаг
        const leverX = 10;
        const leverY = this.height/2;
        const leverLength = this.width - 20;
        const leverAngle = this.leverPosition * Math.PI / 4; // 45 градусов

        ctx.save();
        ctx.translate(leverX, leverY);
        ctx.rotate(this.isClosed ? -leverAngle : leverAngle);

        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leverLength, 0);
        ctx.stroke();

        // Шарик на конце рычага
        ctx.fillStyle = this.isClosed ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(leverLength, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Контакты
        this.terminals.forEach(terminal => {
            ctx.fillStyle = terminal.connected ? '#00ff00' : '#666666';
            ctx.beginPath();
            ctx.arc(terminal.x - this.x, terminal.y - this.y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Обозначения
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';

        if (this.switchType === 'spst') {
            ctx.fillText(this.isClosed ? 'ON' : 'OFF', this.width/2, this.height - 5);
        } else {
            ctx.fillText(this.switchType.toUpperCase(), this.width/2, this.height - 5);
        }

        // Искры при переключении под нагрузкой
        if (Math.abs(this.leverPosition - this.leverTarget) > 0.1 && this.current > 0.1) {
            const sparkX = leverX + leverLength * Math.cos(this.isClosed ? -leverAngle : leverAngle);
            const sparkY = leverY + leverLength * Math.sin(this.isClosed ? -leverAngle : leverAngle);

            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        const status = this.isClosed ? 'ЗАМКНУТ' : 'РАЗОМКНУТ';
        const typeNames = {
            'spst': 'Однополюсный, однонаправленный',
            'spdt': 'Однополюсный, двунаправленный',
            'dpst': 'Двухполюсный, однонаправленный',
            'dpdt': 'Двухполюсный, двунаправленный'
        };

        return {
            ...baseProps,
            'Тип': typeNames[this.switchType] || this.switchType,
            'Состояние': this.isClosed ? '🟢 ' + status : '🔴 ' + status,
            'Сопротивление': this.isClosed ?
                `${this.contactResistance}Ω` : `~${(this.resistance/1000000).toFixed(0)}MΩ`,
            'Напряжение пробоя': `${this.breakdownVoltage}V`,
            'Ток': `${(this.current * 1000).toFixed(1)}mA`
        };
    }
}