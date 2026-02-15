// CurrentBoardSettings.js - UI слой для управления настройками плат
class CurrentBoardSettings {
    constructor() {
        this.modalId = 'currentBoardSettingsModal';
        this.currentBoard = null;
        this.currentBoardConfig = null;
        this.configManager = null;
        this.initialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initialized) return true;

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._init();
        return this.initPromise;
    }

    async _init() {
        try {
            console.log('CurrentBoardSettings initializing...');

            // Ждем инициализации BoardConfigManager
            if (!window.boardConfigManager) {
                console.warn('BoardConfigManager not found, creating new instance');
                window.boardConfigManager = new BoardConfigManager();
            }

            this.configManager = window.boardConfigManager;

            // Если BoardConfigManager еще не инициализирован, инициализируем его
            if (!this.configManager.isReady()) {
                console.log('Waiting for BoardConfigManager initialization...');
                await this.configManager.init();
            }

            this.initialized = true;
            console.log('CurrentBoardSettings initialized successfully');
            return true;
        } catch (error) {
            console.error('CurrentBoardSettings init error:', error);
            this.initialized = false;
            throw error;
        }
    }

    async showModal() {
        try {
            // Инициализируем если еще не инициализирован
            if (!this.initialized) {
                await this.init();
            }

            if (!this.configManager || !this.configManager.isReady()) {
                window.UIManager?.showNotification('Ошибка: менеджер конфигураций не инициализирован', true);
                return;
            }

            // Загружаем текущую плату
            if (!await this.loadCurrentBoard()) return;

            // Сбрасываем временные настройки для новой платы
            this.currentBoardConfig = null;

            window.UIManager?.showModal(this.modalId);
            this.updateModalContent();
        } catch (error) {
            console.error('Error showing settings modal:', error);
            window.UIManager?.showNotification(`Ошибка: ${error.message}`, true);
        }
    }

    async loadCurrentBoard() {
        try {
            const boardSelect = document.getElementById('boardSelect');
            if (!boardSelect?.value) {
                window.UIManager?.showNotification('Сначала выберите плату!', true);
                return false;
            }

            const boardId = boardSelect.value;

            if (window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('get-board-config', boardId);

                if (!result.success || !result.board) {
                    throw new Error('Не удалось получить информацию о плате');
                }

                this.currentBoard = result.board;
                console.log('Loaded current board:', this.currentBoard.name, this.currentBoard.fqbn);
                return true;
            }
        } catch (error) {
            console.error('Error loading board:', error);
            window.UIManager?.showNotification(`Ошибка: ${error.message}`, true);
        }
        return false;
    }

    updateModalContent() {
        if (!this.currentBoard || !this.configManager) return;

        this.updateBoardInfo();
        this.updateConfigControls();
    }

    updateBoardInfo() {
        const container = document.getElementById('currentBoardInfo');
        if (!container) return;

        const board = this.currentBoard;
        const html = `
            <div class="board-info-container">
                <div class="result-header">
                    <h3>${board.name}</h3>
                    <span class="board-status ${board.installed ? 'success' : 'warning'}">
                        ${board.installed ? '✓ Установлена' : '⚠ Не установлена'}
                    </span>
                </div>
                <div class="board-info-details">
                    ${board.fqbn ? `<p><strong>FQBN:</strong> <code>${board.fqbn}</code></p>` : ''}
                    ${board.coreId ? `<p><strong>Ядро:</strong> ${board.coreId}</p>` : ''}
                    ${board.mcu ? `<p><strong>Процессор:</strong> ${board.mcu}</p>` : ''}
                    ${board.frequency ? `<p><strong>Частота:</strong> ${this.formatFrequency(board.frequency)}</p>` : ''}
                    ${board.maxSize ? `<p><strong>Память:</strong> ${this.formatBytes(board.maxSize)}</p>` : ''}
                </div>
                ${this.getPinsInfo(board)}
            </div>
        `;

        container.innerHTML = html;
    }

    getPinsInfo(board) {
        if (!board.pins) return '';

        const pins = board.pins;
        let html = '<div class="pins-info"><strong>Контакты:</strong><ul>';

        if (pins.digital) {
            html += `<li>Цифровые: ${pins.digital}</li>`;
        }
        if (pins.analog) {
            html += `<li>Аналоговые: ${pins.analog}</li>`;
        }
        if (pins.pwm) {
            if (pins.pwm === 'all') {
                html += `<li>ШИМ: все цифровые</li>`;
            } else if (Array.isArray(pins.pwm) && pins.pwm.length > 0) {
                html += `<li>ШИМ: ${pins.pwm.join(', ')}</li>`;
            }
        }

        html += '</ul></div>';
        return html;
    }

    formatFrequency(freq) {
        if (!freq) return '';

        if (typeof freq === 'string') {
            if (freq.endsWith('L')) {
                const value = parseInt(freq);
                return (value / 1000000) + ' MHz';
            }
            const value = parseInt(freq);
            if (!isNaN(value)) {
                return (value / 1000000) + ' MHz';
            }
        } else if (typeof freq === 'number') {
            return (freq / 1000000) + ' MHz';
        }
        return freq;
    }

    formatBytes(bytes) {
        if (!bytes) return '';
        const size = parseInt(bytes);
        if (isNaN(size)) return bytes;

        if (size >= 1024 * 1024) {
            return (size / (1024 * 1024)).toFixed(1) + ' MB';
        } else if (size >= 1024) {
            return (size / 1024).toFixed(1) + ' KB';
        }
        return size + ' bytes';
    }

    updateConfigControls() {
        const container = document.getElementById('configurationOptions');
        if (!container || !this.currentBoard || !this.configManager) return;

        const boardId = this.currentBoard.id;
        const boardType = this.configManager.getBoardType(boardId);
        const userSettings = this.configManager.userConfig[boardId] || {};
        const availableOptions = this.configManager.getAvailableOptions(boardId, boardType, this.currentBoard.properties);

        let html = '<h4>Настройки конфигурации</h4><div class="config-form">';

        // Основные параметры
        html += '<div class="config-section"><h5>Основные параметры</h5>';

        // MCU/Процессор
        if (availableOptions.mcu && availableOptions.mcu.length > 0) {
            const label = boardType === 'esp' ? 'Модель чипа:' : 'Процессор:';
            const currentValue = userSettings.mcu || this.currentBoard.mcu || '';
            html += this.createSelect('mcu', label, availableOptions.mcu, currentValue, boardType);
        }

        // Частота
        if (availableOptions.f_cpu && availableOptions.f_cpu.length > 0) {
            const label = boardType === 'esp' ? 'Тактовая частота:' : 'Частота процессора:';
            const currentValue = userSettings.f_cpu || this.currentBoard.frequency || '';
            html += this.createSelect('f_cpu', label, availableOptions.f_cpu, currentValue, boardType);
        }

        // Вариант платы
        if (availableOptions.variant && availableOptions.variant.length > 0) {
            const currentValue = userSettings.variant || this.currentBoard.variant || '';
            html += this.createSelect('variant', 'Вариант платы:', availableOptions.variant, currentValue, boardType);
        }

        html += '</div>';

        // Настройки загрузки
        html += '<div class="config-section"><h5>Настройки загрузки</h5>';

        // Скорость загрузки
        if (availableOptions.upload_speed && availableOptions.upload_speed.length > 0) {
            const currentValue = userSettings.upload_speed || this.currentBoard.uploadSettings?.speed || '115200';
            html += this.createSelect('upload_speed', 'Скорость загрузки:', availableOptions.upload_speed, currentValue, boardType);
        }

        // Программатор (только для поддерживаемых плат)
        if (availableOptions.programmer && availableOptions.programmer.length > 0) {
            const currentValue = userSettings.programmer || '';
            html += this.createSelect('programmer', 'Программатор:', availableOptions.programmer, currentValue, boardType);
        }

        // ESP-специфичные настройки
        if (boardType === 'esp') {
            if (availableOptions.flash_size && availableOptions.flash_size.length > 0) {
                const currentValue = userSettings.flash_size || '';
                html += this.createSelect('flash_size', 'Размер флеш-памяти:', availableOptions.flash_size, currentValue, boardType);
            }

            if (availableOptions.flash_mode && availableOptions.flash_mode.length > 0) {
                const currentValue = userSettings.flash_mode || '';
                html += this.createSelect('flash_mode', 'Режим флеш-памяти:', availableOptions.flash_mode, currentValue, boardType);
            }

            if (availableOptions.partition_scheme && availableOptions.partition_scheme.length > 0) {
                const currentValue = userSettings.partition_scheme || '';
                html += this.createSelect('partition_scheme', 'Схема разделов:', availableOptions.partition_scheme, currentValue, boardType);
            }
        }

        html += '</div>';

        // Кнопки действий
        html += `
            <div class="form-actions">
                <button class="btn btn-primary" onclick="currentBoardSettings.saveAllSettings()">
                    Сохранить настройки
                </button>
                <button class="btn btn-secondary" onclick="currentBoardSettings.resetSettings()">
                    Сбросить настройки
                </button>
                <button class="btn btn-info" onclick="currentBoardSettings.loadBoardDefaults()">
                    Загрузить значения по умолчанию
                </button>
            </div>
        </div>`;

        container.innerHTML = html;
    }

    createSelect(id, label, options, selectedValue, boardType) {
        if (!options || options.length === 0) return '';

        let html = `
            <div class="form-group">
                <label>${label}</label>
                <select id="${id}" class="form-select" data-setting="${id}">
                    <option value="">-- Выберите --</option>
        `;

        // Для массивов опций обрабатываем каждый элемент
        const optionList = Array.isArray(options) ? options : [options];

        optionList.forEach(option => {
            let displayValue = this.formatOptionValue(option, id, boardType);
            const selected = option === selectedValue ? 'selected' : '';
            html += `<option value="${option}" ${selected}>${displayValue}</option>`;
        });

        html += '</select></div>';
        return html;
    }

    formatOptionValue(option, settingId, boardType) {
        switch(settingId) {
            case 'upload_speed':
                return `${option} бод`;

            case 'programmer':
                return this.formatProgrammerName(option);

            case 'mcu':
                return this.formatMCUName(option, boardType);

            case 'f_cpu':
                return this.formatFrequency(option);

            case 'flash_size':
                return option;

            case 'flash_mode':
                return option.toUpperCase();

            default:
                return option;
        }
    }

    formatProgrammerName(programmer) {
        const names = {
            'arduinoasisp': 'Arduino ISP',
            'usbasp': 'USBasp',
            'usbtinyisp': 'USBtinyISP',
            'arduino': 'Arduino (стандартный)',
            'stk500v1': 'STK500 v1',
            'stk500v2': 'STK500 v2',
            'wiring': 'Wiring',
            'esptool': 'ESP Tool'
        };
        return names[programmer] || programmer;
    }

    formatMCUName(mcu, boardType) {
        if (mcu.includes(':')) {
            const [chip, variant] = mcu.split(':');
            const chipName = this.formatChipName(chip);
            return `${chipName} (${variant})`;
        }
        return this.formatChipName(mcu);
    }

    formatChipName(chip) {
        const names = {
            'atmega328p': 'ATmega328P',
            'atmega2560': 'ATmega2560',
            'atmega32u4': 'ATmega32U4',
            'attiny85': 'ATtiny85',
            'esp8266': 'ESP8266',
            'esp32': 'ESP32',
            'stm32f103c8': 'STM32F103C8',
            'samd21': 'SAMD21'
        };
        return names[chip.toLowerCase()] || chip;
    }

    saveAllSettings() {
        if (!this.currentBoard || !this.configManager) return;

        const boardId = this.currentBoard.id;
        const settings = {};

        // Собираем значения из всех select элементов
        const configElements = document.querySelectorAll('#configurationOptions select[data-setting]');
        configElements.forEach(select => {
            const value = select.value;
            if (value && value.trim() && value !== "-- Выберите --") {
                settings[select.getAttribute('data-setting')] = value;
            }
        });

        if (Object.keys(settings).length > 0) {
            this.configManager.saveBoardSettings(boardId, settings);
            window.UIManager?.showNotification('Настройки сохранены');
        } else {
            window.UIManager?.showNotification('Нет настроек для сохранения', true);
        }
    }

    resetSettings() {
        if (!this.currentBoard || !this.configManager) return;

        const boardId = this.currentBoard.id;

        // Удаляем настройки для этой платы
        delete this.configManager.userConfig[boardId];
        this.configManager.saveUserConfig();

        window.UIManager?.showNotification('Настройки сброшены');
        this.updateConfigControls();
    }

    loadBoardDefaults() {
        if (!this.currentBoard || !this.configManager) return;

        const boardId = this.currentBoard.id;
        const boardType = this.configManager.getBoardType(boardId);

        // Загружаем дефолтные настройки для типа платы
        const defaultSettings = {
            upload_speed: '115200',
            protocol: 'serial'
        };

        // Добавляем дефолтные значения в зависимости от типа платы
        if (boardType === 'avr') {
            defaultSettings.programmer = '';
        } else if (boardType === 'esp') {
            defaultSettings.programmer = 'esptool';
        }

        // Обновляем UI
        const configElements = document.querySelectorAll('#configurationOptions select[data-setting]');
        configElements.forEach(select => {
            const setting = select.getAttribute('data-setting');
            if (defaultSettings[setting]) {
                select.value = defaultSettings[setting];
            }
        });

        window.UIManager?.showNotification('Загружены значения по умолчанию');
    }

    // Метод для обратной совместимости с UploadManager
    // В методе getUploadSettings CurrentBoardSettings.js добавьте:

    getUploadSettings(boardId = null) {
        // Инициализируем если еще не инициализирован

        if (!this.configManager) {
            console.warn('BoardConfigManager not available, returning default settings');
            return { speed: '115200', protocol: 'serial' };
        }

        // Если boardId не передан, получаем из выпадающего списка
        if (!boardId) {
            const boardSelect = document.getElementById('boardSelect');
            boardId = boardSelect?.value;
        }

        if (!boardId) {
            console.warn('No board ID provided');
            return { speed: '115200', protocol: 'serial' };
        }

        const boardType = this.configManager.getBoardType(boardId);
        const settings = this.configManager.getUploadSettings(boardId);

        // Для ESP плат добавляем upload-tool вместо programmer
        if (boardType === 'esp') {
            // ESP платы используют esptool как upload-tool
            if (settings.programmer === 'esptool') {
                delete settings.programmer;
            }
            // ESP платы не используют программатор в традиционном смысле
            delete settings.programmer;
        }

        // Для AVR плат удаляем ESP-специфичные настройки
        if (boardType === 'avr') {
            delete settings.flash_size;
            delete settings.flash_mode;
            delete settings.partition_scheme;
        }

        return settings;
    }

    async installDriver() {
        const driverSelect = document.getElementById('driverSelect');
        if (!driverSelect) return;

        const driverType = driverSelect.value;

        try {
            window.UIManager.showNotification(`Установка драйвера ${driverType}...`);


            // Fallback для локальной установки
            const fs = require('fs-extra');
            const path = require('path');
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const driversPath = path.join(__dirname, 'drivers');

            if (!fs.existsSync(driversPath)) {
                window.UIManager.showNotification('Папка drivers не найдена', true);
                return;
            }

            let driverFile = '';
            switch(driverType) {
                case 'ch340':
                    driverFile = path.join(driversPath, 'CH340', 'CH341SER.EXE');
                    break;
                case 'cp210x':
                    driverFile = path.join(driversPath, 'CP210x', 'CP210xVCPInstaller_x64.exe');
                    break;
                case 'ft232':
                    driverFile = path.join(driversPath, 'FTDI', 'CDM21228_Setup.exe');
                    break;
            }

            if (fs.existsSync(driverFile)) {
                await execAsync(`"${driverFile}" /S`);
                window.UIManager.showNotification('Драйвер установлен. Может потребоваться перезагрузка.');
            } else {
                window.UIManager.showNotification(`Файл драйвера не найден: ${driverFile}`, true);
            }

        } catch (error) {
            console.error('Error installing driver:', error);
            window.UIManager.showNotification(`Ошибка установки: ${error.message}`, true);
        }
    }

    async checkDrivers() {
        try {
            window.UIManager.showNotification('Проверка COM-портов...');

            if (window.ipcRenderer) {
                const portsResult = await window.ipcRenderer.invoke('get-serial-ports');

                const driverStatus = document.getElementById('driverStatus');
                if (driverStatus) {
                    if (portsResult.length === 0) {
                        driverStatus.innerHTML = `
                            <div class="driver-status error">
                                <strong>Не найдено COM-портов</strong>
                                <p>Подключите устройство или установите драйверы.</p>
                            </div>
                        `;
                    } else {
                        const portsHtml = portsResult.map(port =>
                            `<div class="port-item">
                                <strong>${port.displayName || port.path}</strong><br>
                                Производитель: ${port.manufacturer || 'Неизвестно'}
                            </div>`
                        ).join('');

                        driverStatus.innerHTML = `
                            <div class=" success">
                                <strong>Найдено устройств: ${portsResult.length}</strong>
                                ${portsHtml}
                            </div>
                        `;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking drivers:', error);
            window.UIManager.showNotification(`Ошибка проверки: ${error.message}`, true);
        }
    }
}

// Глобальная инициализация
if (typeof window !== 'undefined') {
    window.CurrentBoardSettings = CurrentBoardSettings;

    let currentBoardSettingsInstance = null;

    function initializeCurrentBoardSettings() {
        if (!currentBoardSettingsInstance) {
            currentBoardSettingsInstance = new CurrentBoardSettings();
            window.currentBoardSettings = currentBoardSettingsInstance;

            // Начинаем инициализацию сразу
            currentBoardSettingsInstance.init().catch(error => {
                console.error('Failed to initialize CurrentBoardSettings:', error);
            });
        }
        return currentBoardSettingsInstance;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeCurrentBoardSettings();
    });
}