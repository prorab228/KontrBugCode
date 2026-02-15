// ConfigManager.js - Универсальный менеджер конфигураций
const fs = require('fs-extra');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configs = {};
        this.builtinBoards = {};
        this.uploadProfiles = {};
        this.boardDefaults = {};
     //   this.configPath = './config/boards'; //path.join(__dirname, '..', '..', 'configs');
        this.configPath = path.join(__dirname, 'config');
    }

    async init() {
        try {
            console.log('Loading configurations from:', this.configPath);

            // Загружаем встроенные платы
            await this.loadBuiltinBoards();

            // Загружаем профили загрузки
            await this.loadUploadProfiles();

            // Загружаем дефолтные настройки плат
            await this.loadBoardDefaults();

            console.log(`ConfigManager loaded: ${Object.keys(this.builtinBoards).length} builtin boards, ${Object.keys(this.uploadProfiles.types || {}).length} upload types`);

            return true;
        } catch (error) {
            console.error('ConfigManager init error:', error);
            return false;
        }
    }

    async loadBuiltinBoards() {
        try {
            const builtinPath = path.join(this.configPath,  'builtin.json');
            if (await fs.pathExists(builtinPath)) {
                this.builtinBoards = await fs.readJson(builtinPath);
                console.log(`Loaded ${Object.keys(this.builtinBoards).length} builtin boards`);
            } else {
                console.warn('Builtin boards config not found');
                this.builtinBoards = {};
            }
        } catch (error) {
            console.error('Error loading builtin boards:', error);
            this.builtinBoards = {};
        }
    }

    async loadUploadProfiles() {
        try {
            const profilesPath = path.join(this.configPath, 'boards', 'upload_profiles.json');
            if (await fs.pathExists(profilesPath)) {
                this.uploadProfiles = await fs.readJson(profilesPath);
            } else {
                console.warn('Upload profiles config not found, using defaults');
                this.uploadProfiles = this.getDefaultUploadProfiles();
            }
        } catch (error) {
            console.error('Error loading upload profiles:', error);
            this.uploadProfiles = this.getDefaultUploadProfiles();
        }
    }

    async loadBoardDefaults() {
        try {
            const defaultsPath = path.join(this.configPath, 'boards', 'board_defaults.json');
            if (await fs.pathExists(defaultsPath)) {
                this.boardDefaults = await fs.readJson(defaultsPath);
            } else {
                this.boardDefaults = {};
            }
        } catch (error) {
            console.error('Error loading board defaults:', error);
            this.boardDefaults = {};
        }
    }

    getDefaultUploadProfiles() {
        return {
            defaults: {
                speed: '115200',
                protocol: 'serial'
            },
            types: {
                avr: {
                    programmer: '',
                    programmers: ['arduinoasisp', 'usbasp', 'usbtinyisp']
                },
                esp: {
                    programmer: 'esptool',
                    flash_size: ['2M', '4M', '8M', '16M'],
                    flash_mode: ['qio', 'qout', 'dio', 'dout']
                }
            }
        };
    }

    getBuiltinBoard(boardId) {
        return this.builtinBoards[boardId] || null;
    }

    getAllBuiltinBoards() {
        return Object.values(this.builtinBoards);
    }

    getUploadProfileForType(boardType) {
        return this.uploadProfiles.types?.[boardType] || {};
    }

    getBoardSpecificProfile(fqbn) {
        return this.uploadProfiles.board_specific?.[fqbn] || {};
    }

    getDefaultUploadSettings() {
        return this.uploadProfiles.defaults || { speed: '115200', protocol: 'serial' };
    }

    getBoardDefaults(fqbn) {
        return this.boardDefaults[fqbn] || {};
    }

    async saveBoardDefaults(fqbn, defaults) {
        try {
            const defaultsPath = path.join(this.configPath, 'boards', 'board_defaults.json');
            this.boardDefaults[fqbn] = defaults;
            await fs.writeJson(defaultsPath, this.boardDefaults, { spaces: 2 });
            return true;
        } catch (error) {
            console.error('Error saving board defaults:', error);
            return false;
        }
    }
}

module.exports = ConfigManager;