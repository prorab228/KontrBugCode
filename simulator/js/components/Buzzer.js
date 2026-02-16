class Buzzer extends BaseComponent {
    constructor(config = {}) {
        super('buzzer', {
            color: '#FFD700',
            width: 40,
            height: 40,
            isAC: true, // Зуммеры обычно работают с AC
            ...config
        });

        // Характеристики
        this.resonantFrequency = config.frequency || 440; // Резонансная частота, Гц
        this.sensitivity = config.sensitivity || 0.1; // Чувствительность, дБ/В
        this.maxSoundLevel = config.maxSoundLevel || 85; // Максимальный уровень звука, дБ
        this.impedance = config.impedance || 8; // Импеданс, Ом (типично 4, 8, 16)

        // Состояние
        this.soundLevel = 0; // Уровень звука, дБ
        this.isActive = false;
        this.vibrationAmplitude = 0; // Амплитуда вибрации для анимации

        // Аудио контекст (если поддерживается браузером)
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;

        // Для симуляции звука
        this.wavePhase = 0;
        this.lastActivationTime = 0;

        this.addTerminal('+', 'signal', 0, this.height/2);
        this.addTerminal('-', 'ground', this.width, this.height/2);

        // Инициализация Web Audio API
        this.initAudio();
    }

    initAudio() {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            try {
                this.audioContext = new (AudioContext || webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API недоступна:', e);
            }
        }
    }

    update(deltaTime) {
        super.update(deltaTime);

        const positiveTerminal = this.terminals.find(t => t.name === '+');
        const negativeTerminal = this.terminals.find(t => t.name === '-');

        if (!positiveTerminal || !negativeTerminal) return;

        // Определяем, активен ли зуммер
        let driveVoltage = 0;
        let driveFrequency = this.resonantFrequency;

        if (this.isAC) {
            const voltageAC1 = positiveTerminal.voltageAC || 0;
            const voltageAC2 = negativeTerminal.voltageAC || 0;
            driveVoltage = Math.sqrt(Math.pow(voltageAC1, 2) + Math.pow(voltageAC2, 2)) / Math.sqrt(2);

            // Частота может быть задана источником
            if (this.frequency > 0) {
                driveFrequency = this.frequency;
            }
        } else {
            driveVoltage = Math.abs(
                (positiveTerminal.voltage || 0) - (negativeTerminal.voltage || 0)
            );
        }

        // Зуммер активируется при достаточном напряжении
        this.isActive = driveVoltage > 0.5;

        if (this.isActive) {
            // Расчет уровня звука
            this.soundLevel = Math.min(
                this.maxSoundLevel,
                20 * Math.log10(driveVoltage / 0.775) + this.sensitivity // 0.775V = 0dBu
            );

            // Расчет тока (упрощенно)
            if (this.impedance > 0) {
                this.current = driveVoltage / this.impedance;
                this.power = Math.pow(this.current, 2) * this.impedance;
            }

            // Анимация вибрации
            this.vibrationAmplitude = Math.min(1, driveVoltage / 5);
            this.wavePhase += driveFrequency * deltaTime * 2 * Math.PI;
            if (this.wavePhase > Math.PI * 2) this.wavePhase -= Math.PI * 2;

            // Управление звуком через Web Audio API
            this.updateAudio(driveVoltage, driveFrequency);

            this.lastActivationTime = Date.now();
        } else {
            // Затухание
            this.soundLevel = Math.max(0, this.soundLevel - deltaTime * 100);
            this.vibrationAmplitude = Math.max(0, this.vibrationAmplitude - deltaTime * 2);
            this.current = 0;
            this.power = 0;

            // Остановка звука
            this.stopAudio();
        }

        // Проверка на перегрев
        if (this.power > this.getMaxPower()) {
            this.overheat = true;
            if (this.power > this.getMaxPower() * 1.5) {
                this.broken = true;
                this.isActive = false;
                this.stopAudio();
            }
        }
    }

    updateAudio(voltage, frequency) {
        if (!this.audioContext || this.broken) return;

        const volume = Math.min(0.1, voltage / 20); // Ограничение громкости

        if (!this.oscillator) {
            this.oscillator = this.audioContext.createOscillator();
            this.gainNode = this.audioContext.createGain();

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            this.oscillator.start();
        }

        this.oscillator.frequency.value = frequency;
        this.oscillator.type = 'square'; // Типичная форма для зуммера

        // Плавное изменение громкости
        this.gainNode.gain.linearRampToValueAtTime(
            volume,
            this.audioContext.currentTime + 0.1
        );
    }

    stopAudio() {
        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
                this.gainNode.disconnect();
            } catch (e) {
                // Игнорируем ошибки при остановке
            }
            this.oscillator = null;
            this.gainNode = null;
        }
    }

    getMaxPower() {
        return 0.5; // 500mW для типичного зуммера
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;

        // Вибрация
        const vibrationOffset = this.isActive ?
            Math.sin(this.wavePhase) * this.vibrationAmplitude * 3 : 0;

        ctx.translate(centerX + vibrationOffset, centerY + vibrationOffset);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Корпус зуммера
        ctx.fillStyle = this.overheat ? '#ff4444' : this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Граница
        ctx.strokeStyle = this.isActive ? '#ffffff' : '#000000';
        ctx.lineWidth = this.isActive ? 3 : 1;
        ctx.stroke();

        // Диафрагма/динамик
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Анимация звуковых волн
        if (this.isActive && this.vibrationAmplitude > 0) {
            const waveCount = 3;
            for (let i = 0; i < waveCount; i++) {
                const waveOffset = this.wavePhase + (i * 0.5);
                const waveRadius = 15 + 10 * Math.sin(waveOffset) * this.vibrationAmplitude;
                const alpha = 0.3 - (i * 0.1);

                ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.lineWidth = 2 + Math.sin(waveOffset * 2);
                ctx.beginPath();
                ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Иголки диафрагмы (показывают вибрацию)
        if (this.isActive) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const spikeLength = 5 + Math.sin(this.wavePhase * 2 + i) * 3 * this.vibrationAmplitude;
                const x1 = Math.cos(angle) * 5;
                const y1 = Math.sin(angle) * 5;
                const x2 = Math.cos(angle) * (5 + spikeLength);
                const y2 = Math.sin(angle) * (5 + spikeLength);

                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }

        // Информация
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';

        if (this.isActive) {
            ctx.fillText(`${Math.round(this.resonantFrequency)}Hz`, 0, 25);
            ctx.fillText(`${Math.round(this.soundLevel)}dB`, 0, 35);
        }

        ctx.restore();
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            'Резонансная частота': `${Math.round(this.resonantFrequency)} Гц`,
            'Импеданс': `${this.impedance}Ω`,
            'Чувствительность': `${this.sensitivity} дБ/В`,
            'Макс. уровень звука': `${this.maxSoundLevel} дБ`,
            'Текущий уровень': `${Math.round(this.soundLevel)} дБ`,
            'Состояние': this.broken ? '🔴 Сломан' :
                       this.overheat ? '🟡 Перегрев' :
                       this.isActive ? '🟢 Включен' : '⚫ Выключен'
        };
    }
}