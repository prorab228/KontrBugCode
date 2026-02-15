// BoardConfigManager.js - Менеджер конфигураций плат для рендерера
class BoardConfigManager {
    constructor() {
        this.uploadProfiles = null;
        this.userConfig = {};
        this.initialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initialized) return;

        // Если уже идет инициализация, возвращаем тот же промис
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._init();
        return this.initPromise;
    }

    async _init() {
        try {
            console.log('BoardConfigManager initializing...');

            // Загружаем профили через IPC
            if (window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('get-upload-profiles');
                if (result.success) {
                    this.uploadProfiles = result.profiles;
                    console.log('Upload profiles loaded:', Object.keys(this.uploadProfiles.types || {}).length, 'types');
                } else {
                    console.warn('Failed to load upload profiles, using defaults');
                    this.uploadProfiles = this.getDefaultProfiles();
                }
            } else {
                console.warn('IPC not available, using default profiles');
                this.uploadProfiles = this.getDefaultProfiles();
            }

            // Загружаем пользовательские настройки
            this.loadUserConfig();

            this.initialized = true;
            console.log('BoardConfigManager initialized successfully');
            return true;
        } catch (error) {
            console.error('BoardConfigManager init error:', error);

            // Используем дефолтные профили в случае ошибки
            this.uploadProfiles = this.getDefaultProfiles();
            this.loadUserConfig();
            this.initialized = true;

            return false;
        }
    }

    getDefaultProfiles() {
        return {
            defaults: {
                speed: '115200',
                protocol: 'serial'
            },
            types: {
                avr: {
                    programmer: '',
                    programmers: ['arduinoasisp', 'usbasp', 'usbtinyisp', 'arduino', 'stk500v1', 'stk500v2', 'wiring'],
                    mcu: ['atmega328p', 'atmega2560', 'atmega32u4', 'attiny85'],
                    variants: ['standard', 'eightanaloginputs', 'micro', 'ethernet']
                },
                esp: {
                    programmer: 'esptool',
                    flash_size: ['2M', '4M', '8M', '16M'],
                    flash_mode: ['qio', 'qout', 'dio', 'dout'],
                    partition_scheme: ['default', 'minimal', 'huge_app'],
                    core: ['esp8266', 'esp32']
                },
                stm: {
                    protocol: 'stlink',
                    upload_method: ['stlink', 'serial']
                },
                sam: {
                    protocol: 'sam-ba',
                    upload_method: ['sam-ba']
                }
            }
        };
    }

    loadUserConfig() {
        try {
            const saved = localStorage.getItem('board_config');
            if (saved) {
                this.userConfig = JSON.parse(saved);
                console.log('Loaded user config for', Object.keys(this.userConfig).length, 'boards');
            } else {
                this.userConfig = {};
            }
        } catch (error) {
            console.error('Error loading user config:', error);
            this.userConfig = {};
        }
    }

    saveUserConfig() {
        try {
            localStorage.setItem('board_config', JSON.stringify(this.userConfig));
        } catch (error) {
            console.error('Error saving user config:', error);
        }
    }

    getBoardType(boardId) {
        const boardIdLower = boardId.toLowerCase();

        if (boardIdLower.includes('esp32')) return 'esp';
        if (boardIdLower.includes('esp8266')) return 'esp';
        if (boardIdLower.includes('esp')) return 'esp';
        if (boardIdLower.includes('avr')) return 'avr';
        if (boardIdLower.includes('stm32')) return 'stm';
        if (boardIdLower.includes('stm')) return 'stm';
        if (boardIdLower.includes('sam')) return 'sam';
        if (boardIdLower.includes('mik32')) return 'mik32';
        if (boardIdLower.includes('mkr')) return 'sam';
        if (boardIdLower.includes('zero')) return 'sam';

        return 'avr'; // По умолчанию предполагаем AVR
    }

// В методе getUploadSettings класса BoardConfigManager исправьте:

    // В методе getUploadSettings исправьте обработку ESP плат:

    getUploadSettings(boardId) {
        if (!this.initialized) {
            console.warn('BoardConfigManager not initialized, returning default settings');
            return this.getDefaultSettings();
        }

        const boardType = this.getBoardType(boardId);
        const userSettings = this.userConfig[boardId] || {};
        const typeProfile = this.uploadProfiles?.types?.[boardType] || {};
        const defaultProfile = this.uploadProfiles?.defaults || { speed: '115200', protocol: 'serial' };

        // Объединяем настройки в правильном порядке приоритета
        const settings = {
            ...defaultProfile,
            ...userSettings
        };

        // Добавляем одиночные значения из typeProfile, не массивы
        Object.keys(typeProfile).forEach(key => {
            if (!settings[key] && typeProfile[key]) {
                if (Array.isArray(typeProfile[key]) && typeProfile[key].length > 0) {
                    // Если это массив, берем первое значение
                    settings[key] = typeProfile[key][0];
                } else if (!Array.isArray(typeProfile[key])) {
                    settings[key] = typeProfile[key];
                }
            }
        });

        // Для ESP плат не используем программатор через --programmer
        if (boardType === 'esp') {
            // Удаляем настройку программатора для ESP
            delete settings.programmer;
        }

        // Очищаем пустые значения
        Object.keys(settings).forEach(key => {
            if (settings[key] === '' || settings[key] === null || settings[key] === undefined) {
                delete settings[key];
            }
        });

        console.log(`Generated upload settings for ${boardId} (${boardType}):`, settings);
        return settings;
    }

    getDefaultSettings() {
        return {
            speed: '115200',
            protocol: 'serial'
        };
    }

    saveBoardSettings(boardId, settings) {
        this.userConfig[boardId] = this.cleanSettings(boardId, settings);
        this.saveUserConfig();
        console.log(`Settings saved for board: ${boardId}`);
    }

    cleanSettings(boardId, settings) {
        const boardType = this.getBoardType(boardId);
        const cleaned = { ...settings };

        // Удаляем неподходящие настройки для типа платы
        if (boardType === 'esp') {
            delete cleaned.programmer;
            delete cleaned.variant;
        }

        if (boardType === 'avr') {
            delete cleaned.flash_size;
            delete cleaned.flash_mode;
            delete cleaned.partition_scheme;
        }

        // Удаляем пустые значения
        Object.keys(cleaned).forEach(key => {
            if (!cleaned[key] || cleaned[key].toString().trim() === '') {
                delete cleaned[key];
            }
        });

        return cleaned;
    }

    getAvailableOptions(boardId, boardType, boardProperties) {
        const options = {
            mcu: [],
            f_cpu: [],
            variant: [],
            upload_speed: ['9600', '19200', '38400', '57600', '115200', '230400', '460800', '921600'],
            programmer: [],
            flash_size: [],
            flash_mode: [],
            partition_scheme: []
        };

        // Заполняем из свойств платы
        if (boardProperties) {
            this.extractOptionsFromProperties(boardProperties, options);
        }

        // Добавляем опции из профиля
        const typeProfile = this.uploadProfiles?.types?.[boardType];
        if (typeProfile) {
            if (typeProfile.programmers) {
                options.programmer = [...new Set([...options.programmer, ...typeProfile.programmers])];
            }
            if (typeProfile.flash_size) {
                options.flash_size = typeProfile.flash_size;
            }
            if (typeProfile.flash_mode) {
                options.flash_mode = typeProfile.flash_mode;
            }
            if (typeProfile.partition_scheme) {
                options.partition_scheme = typeProfile.partition_scheme;
            }
        }

        return options;
    }

    extractOptionsFromProperties(properties, options) {
        Object.entries(properties).forEach(([key, value]) => {
            if (key.includes('menu.')) {
                this.parseMenuOption(key, value, options);
            } else if (key === 'build.mcu' || key.includes('.mcu')) {
                options.mcu = this.parseCommaSeparated(value);
            } else if (key === 'build.f_cpu' || key.includes('.f_cpu')) {
                options.f_cpu = this.parseCommaSeparated(value);
            } else if (key === 'build.variant' || key.includes('.variant')) {
                options.variant = this.parseCommaSeparated(value);
            } else if (key === 'upload.speed' || key.includes('.speed')) {
                options.upload_speed = this.parseCommaSeparated(value);
            } else if (key === 'upload.programmer' || key.includes('.programmer')) {
                options.programmer = this.parseCommaSeparated(value);
            }
        });
    }

    parseMenuOption(key, value, options) {
        const match = key.match(/^menu\.(\w+)\.([^.]+)\.(.+)$/);
        if (!match) return;

        const [, menuType, optionName, property] = match;

        if (property === 'build.mcu') {
            if (!options.mcu.includes(optionName)) {
                options.mcu.push(optionName);
            }
        } else if (property === 'build.f_cpu') {
            if (!options.f_cpu.includes(value)) {
                options.f_cpu.push(value);
            }
        }
    }

    parseCommaSeparated(value) {
        if (!value) return [];
        return String(value).split(',').map(v => v.trim()).filter(v => v);
    }

    // Проверка доступности
    isReady() {
        return this.initialized;
    }
}

// Глобальный экземпляр - инициализируем сразу, но асинхронно
if (typeof window !== 'undefined') {
    window.boardConfigManager = new BoardConfigManager();

    // Начинаем инициализацию, но не ждем ее завершения
    window.boardConfigManager.init().catch(error => {
        console.error('Failed to initialize BoardConfigManager:', error);
    });

    window.BoardConfigManager = BoardConfigManager;
}