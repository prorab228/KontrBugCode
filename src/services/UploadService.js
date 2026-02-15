// UploadService.js - Финальная версия с правильными флагами для Arduino CLI
const { spawn } = require('child_process');
const iconv = require('iconv-lite');
const path = require('path');
const fs = require('fs-extra');

class UploadService {
    constructor(boardManager) {
        this.boardManager = boardManager;
        this.currentProcess = null;
        this.onProgress = null;
        this.lastMessage = ''; // Для предотвращения дублирования
        this.messageCount = 0; // Счетчик повторяющихся сообщений
    }

    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    async uploadSketch({ sketchPath, boardId, port, uploadSettings = {} }) {
        try {
            const boardConfig = this.boardManager.getBoardConfig(boardId);
            if (!boardConfig) {
                throw new Error(`Конфигурация платы ${boardId} не найдена`);
            }

            console.log('Board config for upload:', boardConfig);
            console.log('Upload settings received:', uploadSettings);

            if (!this.boardManager.arduinoCliPath) {
                throw new Error('Arduino CLI не найден');
            }

            const cliPath = this.boardManager.arduinoCliPath;
            if (!fs.existsSync(cliPath)) {
                throw new Error(`Arduino CLI не найден по пути: ${cliPath}`);
            }

            console.log('Using Arduino CLI at:', cliPath);

            // Определяем тип платы
            const boardType = this.getBoardType(boardConfig);
            console.log('Board type:', boardType);

            // Используем базовый FQBN
            let fqbn = boardConfig.fqbn;
            let args = ['upload', '--fqbn', fqbn, '--port', port];

            // Добавляем скорость загрузки
            const speed = this.getStringValue(uploadSettings.speed || boardConfig.uploadSettings?.speed || '115200');
            console.log('Using upload speed:', speed);

            if (speed && speed.trim()) {
                args.push('--upload-property', `serial.port.speed=${speed}`);
            }

            // ВАЖНО: Для ESP плат НЕ используем программатор через --programmer
            // ESP платы используют свой собственный загрузчик
            if (boardType === 'avr' && uploadSettings.programmer) {
                const programmer = this.getStringValue(uploadSettings.programmer);
                if (programmer && programmer.trim()) {
                    // Проверяем, что программатор существует для AVR
                    if (this.isValidAVRProgrammer(programmer)) {
                        args.push('--programmer', programmer);
                        console.log(`Using AVR programmer: ${programmer}`);
                    } else {
                        console.warn(`Invalid AVR programmer: ${programmer}, skipping`);
                    }
                }
            }

            // Добавляем основные параметры сборки
            if (uploadSettings.mcu) {
                const mcu = this.getStringValue(uploadSettings.mcu);
                if (mcu && mcu.trim()) {
                    args.push('--upload-property', `build.mcu=${mcu}`);
                }
            }

            if (uploadSettings.f_cpu) {
                const f_cpu = this.getStringValue(uploadSettings.f_cpu);
                if (f_cpu && f_cpu.trim()) {
                    args.push('--upload-property', `build.f_cpu=${f_cpu}`);
                }
            }

            if (uploadSettings.variant) {
                const variant = this.getStringValue(uploadSettings.variant);
                if (variant && variant.trim()) {
                    args.push('--upload-property', `build.variant=${variant}`);
                }
            }

            // ESP-специфичные настройки
            if (boardType === 'esp') {
                if (uploadSettings.flash_size) {
                    const flash_size = this.getStringValue(uploadSettings.flash_size);
                    if (flash_size && flash_size.trim()) {
                        args.push('--upload-property', `build.flash_size=${flash_size}`);
                    }
                }

                if (uploadSettings.flash_mode) {
                    const flash_mode = this.getStringValue(uploadSettings.flash_mode);
                    if (flash_mode && flash_mode.trim()) {
                        args.push('--upload-property', `build.flash_mode=${flash_mode}`);
                    }
                }

                if (uploadSettings.partition_scheme) {
                    const partition_scheme = this.getStringValue(uploadSettings.partition_scheme);
                    if (partition_scheme && partition_scheme.trim()) {
                        args.push('--upload-property', `build.partitions=${partition_scheme}`);
                    }
                }

                // Для ESP плат добавляем дополнительные настройки через --upload-property
                if (uploadSettings.upload_speed) {
                    const upload_speed = this.getStringValue(uploadSettings.upload_speed);
                    if (upload_speed && upload_speed.trim()) {
                        args.push('--upload-property', `upload.speed=${upload_speed}`);
                    }
                }

                // Для ESP8266 используем esptool как инструмент
                if (boardConfig.fqbn.includes('esp8266')) {
                    // Для ESP8266 можно указать esptool как программатор, но это не всегда требуется
                    // args.push('--upload-property', 'upload.tool=esptool');
                }
            }

            // Путь к скетчу
            args.push(sketchPath);

            console.log('Upload command args:', args);

            // Отправляем событие начала
            this.sendProgress({
                stage: 'start',
                message: `Начинаю загрузку на ${boardConfig.name}`,
                percentage: 5
            });

            return new Promise((resolve, reject) => {
                this.currentProcess = spawn(cliPath, args, {
                    shell: false,
                    cwd: path.dirname(sketchPath),
                    env: { ...process.env, PYTHONIOENCODING: 'utf-8', LC_ALL: 'en_US.UTF-8' }
                });

                let stdout = '';
                let stderr = '';
                this.lastMessage = '';
                this.messageCount = 0;

                this.currentProcess.stdout.on('data', (data) => {
                    const output = this.decodeOutput(data);
                    stdout += output;

                    this.processOutput(output, 'stdout');
                });

                this.currentProcess.stderr.on('data', (data) => {
                    const output = this.decodeOutput(data);
                    stderr += output;

                    this.processOutput(output, 'stderr');
                });

                this.currentProcess.on('close', (code) => {
                    console.log(`Upload process exited with code ${code}`);
                    this.currentProcess = null;

                    const finalStdout = this.decodeOutput(Buffer.from(stdout));
                    const finalStderr = this.decodeOutput(Buffer.from(stderr));

                    if (code === 0) {
                        this.sendProgress({
                            stage: 'complete',
                            message: '✅ Загрузка завершена успешно!',
                            percentage: 100,
                            details: finalStdout
                        });

                        resolve({
                            success: true,
                            stdout: finalStdout,
                            stderr: finalStderr
                        });
                    } else {
                        const errorMsg = `Загрузка завершилась с кодом ${code}`;
                        console.error('Upload error:', errorMsg, finalStderr);

                        // Проверяем, нет ли ошибки связанной с программатором
                        if (finalStderr.includes("Programmer 'esptool' not found")) {
                            this.sendProgress({
                                stage: 'error',
                                message: 'Ошибка: esptool не найден. Убедитесь, что ядро ESP установлено правильно.',
                                details: finalStderr.substring(0, 500),
                                percentage: 100
                            });
                            reject(new Error('esptool не найден. Проверьте установку ядра ESP.'));
                        } else {
                            this.sendProgress({
                                stage: 'error',
                                message: errorMsg,
                                details: finalStderr.substring(0, 500),
                                percentage: 100
                            });
                            reject(new Error(`${errorMsg}: ${finalStderr.substring(0, 200)}`));
                        }
                    }
                });

                this.currentProcess.on('error', (error) => {
                    console.error('Upload process error:', error);
                    this.currentProcess = null;

                    this.sendProgress({
                        stage: 'error',
                        message: `Ошибка запуска процесса: ${error.message}`,
                        percentage: 100
                    });

                    reject(error);
                });

                // Увеличиваем таймаут для ESP плат (они могут загружаться дольше)
                const timeout = boardType === 'esp' ? 180000 : 120000; // 3 минуты для ESP, 2 для остальных
                setTimeout(() => {
                    if (this.currentProcess) {
                        this.currentProcess.kill();
                        const timeoutError = new Error(`Таймаут загрузки (${timeout/1000} секунд)`);
                        this.sendProgress({
                            stage: 'error',
                            message: timeoutError.message,
                            percentage: 100
                        });
                        reject(timeoutError);
                    }
                }, timeout);
            });

        } catch (error) {
            console.error('Upload error:', error);

            this.sendProgress({
                stage: 'error',
                message: error.message.substring(0, 500),
                percentage: 100
            });

            return {
                success: false,
                error: error.message,
                stdout: '',
                stderr: ''
            };
        }
    }

    // Метод для безопасного получения строкового значения
    getStringValue(value) {
        if (value === undefined || value === null) {
            return '';
        }

        if (Array.isArray(value)) {
            // Если это массив, берем первый элемент
            if (value.length > 0) {
                return String(value[0]).trim();
            }
            return '';
        }

        return String(value).trim();
    }

    // Новый метод для обработки вывода с фильтрацией дубликатов
    processOutput(output, source) {
        const lines = output.split('\n');

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Фильтруем дублирующиеся сообщения
            if (trimmed === this.lastMessage) {
                this.messageCount++;
                // Если одно сообщение повторяется более 3 раз, пропускаем
                if (this.messageCount > 3) {
                    return;
                }
            } else {
                this.lastMessage = trimmed;
                this.messageCount = 1;
            }

            // Фильтруем служебные сообщения, которые не несут полезной информации
            if (this.isNoiseMessage(trimmed)) {
                return;
            }

            let logType = 'uploading';
            if (trimmed.includes('error') || trimmed.includes('failed') || trimmed.includes('Error')) {
                logType = 'error';
            } else if (trimmed.includes('successful') || trimmed.includes('done') ||
                      trimmed.includes('verified') || trimmed.includes('Wrote')) {
                logType = 'success';
            }

            this.sendProgress({
                stage: 'uploading',
                raw: trimmed,
                message: trimmed,
                source: source
            });

            console.log(`Upload ${source}:`, trimmed);

            // Парсим проценты для прогресс-бара
            const percentageMatch = trimmed.match(/\((\d+)\s*%\)/);
            if (percentageMatch) {
                const percentage = parseInt(percentageMatch[1]);
                const uploadProgress = 30 + (percentage * 0.65);
                this.sendProgress({
                    stage: 'uploading',
                    percentage: uploadProgress,
                    message: `Загрузка ${percentage}%`
                });
            }
        });
    }

    // Проверка, является ли сообщение "шумом"
    isNoiseMessage(message) {
        const noisePatterns = [
            /^\s*$/,
            /^Using\s+.*$/,
            /^\.\.\.$/,
            /^\s*[-|/\\]\s*$/,
            /^\s*\d+\s+bytes\s+.*$/,
            /^LF\s+.*$/,
            /^Scanning\s+.*$/,
            /^Forcing\s+.*$/,
            /^\s*$/
        ];

        return noisePatterns.some(pattern => pattern.test(message));
    }

    // Проверка валидности программатора для AVR
    isValidAVRProgrammer(programmer) {
        const validAVRProgrammers = [
            'arduinoasisp',
            'usbasp',
            'usbtinyisp',
            'avrisp',
            'avrispmkii',
            'usbasp',
            'stk500v1',
            'stk500v2',
            'wiring',
            'arduino' // Стандартный программатор для Arduino
        ];

        return validAVRProgrammers.includes(programmer.toLowerCase());
    }

    sendProgress(data) {
        if (this.onProgress) {
            this.onProgress(data);
        }
    }

    getBoardType(boardConfig) {
        if (!boardConfig) return 'unknown';

        const fqbn = boardConfig.fqbn || '';
        const arch = boardConfig.architecture || '';
        const vendor = boardConfig.vendor || '';

        if (fqbn.includes('esp32') || fqbn.includes('esp8266') ||
            arch.includes('esp') || vendor.includes('esp')) {
            return 'esp';
        } else if (fqbn.includes('avr') || arch.includes('avr') ||
                  fqbn.includes('arduino:avr') || vendor.includes('arduino')) {
            return 'avr';
        } else if (fqbn.includes('stm32') || arch.includes('stm')) {
            return 'stm';
        } else if (fqbn.includes('sam') || fqbn.includes('samd')) {
            return 'sam';
        }

        return 'other';
    }

    decodeOutput(data) {
        try {
            const buffer = Buffer.from(data);
            const encodings = ['utf8', 'win1251', 'cp866', 'cp1251', 'latin1'];

            for (const encoding of encodings) {
                try {
                    return iconv.decode(buffer, encoding);
                } catch (e) {
                    continue;
                }
            }

            return buffer.toString('binary');
        } catch (error) {
            return data.toString('binary');
        }
    }

    cancelUpload() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
            return true;
        }
        return false;
    }
}

module.exports = UploadService;