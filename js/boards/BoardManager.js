// BoardManager.js - Версия без исключения при отсутствии Arduino CLI
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

const ConfigManager = require('./ConfigManager');

class BoardManager {
    constructor() {
        this.arduino15Path = null;
        this.arduinoCliPath = null;
        this.installedBoards = new Map();
        this.installedCores = new Map();
        this.boardCategories = new Map();
        this.additionalUrls = [];
        this.initialized = false;
        this.availableCoresCache = null;
        this.availableCoresCacheTime = null;
        this.CACHE_DURATION = 300000; // 5 минут кэширования

        this.configManager = new ConfigManager();

        console.log('BoardManager created');
        console.log(`Platform: ${os.platform()}, Arch: ${os.arch()}`);
        console.log(`Node.js version: ${process.version}`);
        console.log(`Current directory: ${process.cwd()}`);
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('BoardManager initializing...');
            // Инициализируем конфигурационный менеджер
            await this.configManager.init();

            await this.findArduino15Path();
            await this.findArduinoCli(); // Этот метод теперь не выкидывает исключение
            //await this.cleanupBrokenIndexFiles();
            await this.scanArduino15();
            await this.loadAdditionalUrls();

            this.initialized = true;
            console.log(`BoardManager initialized. Found ${this.installedBoards.size} boards, ${this.installedCores.size} cores`);

            // Проверяем состояние Arduino CLI
            if (this.arduinoCliPath) {
                console.log(`✓ Arduino CLI: ${this.arduinoCliPath}`);
            } else {
                console.log('⚠ Arduino CLI not found. Core installation will be unavailable.');
            }
        } catch (error) {
            console.error('BoardManager init failed:', error);
            // Пробрасываем ошибку дальше, но не из-за отсутствия CLI
            throw error;
        }
    }

//    async cleanupBrokenIndexFiles() {
//        if (!this.arduino15Path) return;
//
//        try {
//            const indexFiles = fs.readdirSync(this.arduino15Path);
//            for (const file of indexFiles) {
//                if (file.length < 10 && !file.includes('.') && !file.includes('package')) {
//                    const filePath = path.join(this.arduino15Path, file);
//                    console.log(`Removing broken index file: ${filePath}`);
//                    fs.unlinkSync(filePath);
//                }
//            }
//        } catch (error) {
//            console.warn('Error cleaning up index files:', error);
//        }
//    }

    async findArduino15Path() {
        const homeDir = os.homedir();
        const platform = os.platform();
        const possiblePaths = [];

        // Windows пути
        if (platform === 'win32') {
            if (process.env.LOCALAPPDATA) {
                possiblePaths.push(path.join(process.env.LOCALAPPDATA, 'Arduino15'));
            }
            if (process.env.APPDATA) {
                possiblePaths.push(path.join(process.env.APPDATA, 'Arduino15'));
            }
            possiblePaths.push(path.join(homeDir, 'AppData', 'Local', 'Arduino15'));
            possiblePaths.push(path.join(homeDir, 'AppData', 'Roaming', 'Arduino15'));
        }
        // macOS пути
        else if (platform === 'darwin') {
            possiblePaths.push(path.join(homeDir, 'Library', 'Arduino15'));
        }
        // Linux и другие пути
        else {
            possiblePaths.push(path.join(homeDir, '.arduino15'));
            possiblePaths.push(path.join(homeDir, 'arduino15'));
            possiblePaths.push(path.join('/opt', 'arduino15'));
        }

        console.log('Searching for Arduino15 in paths:', possiblePaths);

        for (const possiblePath of possiblePaths) {
            try {
                // Проверяем существование папки и подпапки packages
                if (fs.existsSync(possiblePath) && fs.existsSync(path.join(possiblePath, 'packages'))) {
                    this.arduino15Path = possiblePath;
                    console.log(`Found Arduino15 at: ${this.arduino15Path}`);
                    return;
                }
            } catch (error) {
                console.warn(`Error checking path ${possiblePath}:`, error.message);
                continue;
            }
        }

        // Если папка не найдена, устанавливаем стандартный путь, но НЕ создаём её
        const defaultPath = platform === 'win32'
            ? path.join(homeDir, 'AppData', 'Local', 'Arduino15')
            : platform === 'darwin'
                ? path.join(homeDir, 'Library', 'Arduino15')
                : path.join(homeDir, '.arduino15');

        this.arduino15Path = defaultPath;
        console.log(`Arduino15 not found, will use: ${this.arduino15Path} (will be created when needed)`);
    }

    // BoardManager.js - в методе findArduinoCli добавить сохранение абсолютного пути
async findArduinoCli() {
    const platform = os.platform();
    const homeDir = os.homedir();
    const possiblePaths = [];

    console.log(`Looking for Arduino CLI on ${platform}...`);

    // Проверяем пути в том же порядке, что и для компиляции
    if (platform === 'win32') {
        // Windows системные пути
        possiblePaths.push(
            'arduino-cli.exe',
            path.join(process.cwd(), 'arduino-cli.exe'),
            path.join(process.resourcesPath, 'arduino-cli.exe'),
            path.join(process.resourcesPath, 'resources', 'arduino-cli.exe'),
            path.join(process.resourcesPath, '..', 'arduino-cli.exe'),
            path.join(__dirname, 'arduino-cli.exe'),
            path.join(__dirname, '..', 'arduino-cli.exe'),
            path.join(__dirname, '..', '..', 'arduino-cli.exe'),
            path.join(__dirname, '..', '..', '..', 'arduino-cli.exe'),
            path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Arduino CLI', 'arduino-cli.exe'),
            path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Arduino CLI', 'arduino-cli.exe'),
            path.join(process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), 'Arduino CLI', 'arduino-cli.exe')
        );
    } else {
        // Linux/macOS системные пути
        possiblePaths.push(
            'arduino-cli',
            path.join(process.cwd(), 'arduino-cli'),
            path.join(process.resourcesPath, 'arduino-cli'),
            path.join(process.resourcesPath, 'resources', 'arduino-cli'),
            path.join(__dirname, 'arduino-cli'),
            path.join(__dirname, '..', 'arduino-cli'),
            path.join(__dirname, '..', '..', 'arduino-cli'),
            path.join(__dirname, '..', '..', '..', 'arduino-cli'),
            path.join('/usr', 'local', 'bin', 'arduino-cli'),
            path.join('/usr', 'bin', 'arduino-cli'),
            path.join(homeDir, '.local', 'bin', 'arduino-cli'),
            path.join(homeDir, 'bin', 'arduino-cli')
        );
        if (platform === 'darwin') {
            possiblePaths.push(
                path.join('/Applications', 'Arduino CLI.app', 'Contents', 'Resources', 'arduino-cli'),
                path.join('/opt', 'homebrew', 'bin', 'arduino-cli')
            );
        }
    }

    // Удаляем дубликаты
    const uniquePaths = [...new Set(possiblePaths)];

    console.log('Searching Arduino CLI in paths:', uniquePaths);

    for (const cliPath of uniquePaths) {
        try {
            // Проверяем существование файла
            if (!fs.existsSync(cliPath)) {
                continue;
            }

            // Проверяем, что это файл, а не папка
            const stats = fs.statSync(cliPath);
            if (!stats.isFile()) {
                continue;
            }

            console.log(`Testing Arduino CLI at: ${cliPath}`);

            // Команда для проверки - используем execAsync с промисом
            const testCommand = `"${cliPath}" version`;
            const { stdout } = await execAsync(testCommand, {
                timeout: 5000,
                shell: true,
                windowsHide: true
            });

            if (stdout && (stdout.includes('arduino-cli') || stdout.includes('Arduino CLI'))) {
                // Сохраняем абсолютный путь
                const absolutePath = path.resolve(cliPath);
                this.arduinoCliPath = absolutePath;
                console.log(`✓ Arduino CLI found at: ${this.arduinoCliPath}`);
                console.log(`Version output: ${stdout.trim()}`);
                return;
            }
        } catch (e) {
            // Пропускаем ошибки и продолжаем поиск
            continue;
        }
    }

    // Arduino CLI не найден
    console.warn('Arduino CLI not found. Some features will be unavailable.');
    console.log('To enable core installation, please:');
    console.log('1. Download Arduino CLI from https://github.com/arduino/arduino-cli/releases');
    console.log('2. Place arduino-cli.exe (Windows) or arduino-cli (Linux/macOS) in the application folder');
    console.log('3. Restart the application');
    this.arduinoCliPath = null;
}

    async verifyArduinoCli() {
        if (!this.arduinoCliPath) {
            // Вместо исключения возвращаем false
            console.warn('Arduino CLI is not available');
            return false;
        }

        try {
            const testCommand = os.platform() === 'win32'
                ? `"${this.arduinoCliPath}" version`
                : `${this.arduinoCliPath} version`;
            await execAsync(testCommand, { timeout: 5000, shell: true });
            console.log('✓ Arduino CLI verified:', this.arduinoCliPath);
            await this.setupArduinoCliConfig();
            return true;
        } catch (error) {
            console.warn(`Arduino CLI not working: ${error.message}`);
            return false;
        }
    }

    async setupArduinoCliConfig() {
        // Не создаём конфиг, если нет Arduino CLI
        if (!this.arduinoCliPath) {
            console.log('Skipping Arduino CLI config setup - Arduino CLI not found');
            return;
        }

        try {
            const fs = require('fs-extra');
            const path = require('path');

            const configDir = process.cwd();
            const configPath = path.join(configDir, 'arduino-cli.yaml');

            // Убедимся, что arduino15Path существует перед созданием конфига
            let arduino15PathToUse = this.arduino15Path;
            if (!fs.existsSync(arduino15PathToUse)) {
                console.log(`Arduino15 path doesn't exist yet: ${arduino15PathToUse}`);
                // Не создаём папку, она создастся при установке ядра
            }

            const configContent = `
board_manager:
  additional_urls: []
daemon:
  port: "50051"
directories:
  data: ${arduino15PathToUse}
  downloads: ${path.join(arduino15PathToUse, 'staging')}
  user: ${configDir}
library:
  enable_unsafe_install: false
logging:
  file: ""
  format: text
  level: info
metrics:
  addr: :9090
  enabled: true
output:
  no_color: false
sketch:
  always_export_binaries: false
updater:
  enable_notification: true
`;

            await fs.writeFile(configPath, configContent);
            this.arduinoCliConfigPath = configPath;

            console.log('Arduino CLI config created at:', configPath);
            console.log('Updated arduino-cli path:', this.arduinoCliPath);

        } catch (error) {
            console.warn('Failed to setup Arduino CLI config:', error);
        }
    }

    async scanArduino15() {
        if (!this.arduino15Path) {
            console.log('Arduino15 path not set, skipping scan');
            return;
        }

        // Проверяем, существует ли папка Arduino15
        if (!fs.existsSync(this.arduino15Path)) {
            console.log(`Arduino15 directory doesn't exist yet: ${this.arduino15Path}`);
            console.log('It will be created when you install your first core.');
            this.installedBoards.clear();
            this.installedCores.clear();
            this.boardCategories.clear();
            return;
        }

        this.installedBoards.clear();
        this.installedCores.clear();
        this.boardCategories.clear();

        const packagesPath = path.join(this.arduino15Path, 'packages');
        if (!fs.existsSync(packagesPath)) {
            console.log('No packages directory found');
            return;
        }

        try {
            const vendors = fs.readdirSync(packagesPath);
            for (const vendor of vendors) {
                const vendorPath = path.join(packagesPath, vendor);
                if (!fs.statSync(vendorPath).isDirectory()) continue;
                await this.scanVendor(vendor, vendorPath);
            }

            console.log(`Scanned ${this.installedBoards.size} boards and ${this.installedCores.size} cores from Arduino15`);
        } catch (error) {
            console.error('Error scanning Arduino15:', error);
        }
    }

    async scanVendor(vendor, vendorPath) {
        const hardwarePath = path.join(vendorPath, 'hardware');
        if (!fs.existsSync(hardwarePath)) return;

        try {
            const architectures = fs.readdirSync(hardwarePath);
            for (const arch of architectures) {
                const archPath = path.join(hardwarePath, arch);
                if (!fs.statSync(archPath).isDirectory()) continue;
                await this.scanArchitecture(vendor, arch, archPath);
            }
        } catch (error) {
            console.error(`Error scanning vendor ${vendor}:`, error);
        }
    }

    async scanArchitecture(vendor, arch, archPath) {
        try {
            const versions = fs.readdirSync(archPath);
            for (const version of versions) {
                const versionPath = path.join(archPath, version);
                if (!fs.statSync(versionPath).isDirectory()) continue;
                await this.processPlatform(vendor, arch, version, versionPath);
            }
        } catch (error) {
            console.error(`Error scanning architecture ${vendor}:${arch}:`, error);
        }
    }

    async processPlatform(vendor, arch, version, platformPath) {
        try {
            const coreId = `${vendor}:${arch}`;
            const coreInfo = await this.getCoreInfo(vendor, arch, platformPath, version);

            this.installedCores.set(coreId, {
                ...coreInfo,
                id: coreId,
                vendor,
                architecture: arch,
                version,
                path: platformPath,
                installed: true
            });

            await this.parseBoardsTxt(platformPath, vendor, arch, version);
        } catch (error) {
            console.error(`Error processing platform ${vendor}:${arch}:${version}:`, error);
        }
    }

    getCoreInfo(coreId) {
        if (this.installedCores.has(coreId)) {
            return this.installedCores.get(coreId);
        }
        return null;
    }

    async getCoreInfo(vendor, arch, platformPath, version) {
        const platformTxtPath = path.join(platformPath, 'platform.txt');

        if (!fs.existsSync(platformTxtPath)) {
            return {
                name: `${vendor} ${arch}`,
                description: `${vendor} ${arch} Platform`
            };
        }

        try {
            const content = fs.readFileSync(platformTxtPath, 'utf8');
            const lines = content.split('\n');
            const info = {
                name: `${vendor} ${arch}`,
                description: `${vendor} ${arch} Platform`,
                version: version
            };

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('name=')) {
                    info.name = trimmed.substring(5).trim();
                } else if (trimmed.startsWith('version=')) {
                    info.version = trimmed.substring(8).trim();
                } else if (trimmed.startsWith('url=')) {
                    info.url = trimmed.substring(4).trim();
                }
            }

            return info;
        } catch (error) {
            return {
                name: `${vendor} ${arch}`,
                description: `${vendor} ${arch} Platform`,
                version: version
            };
        }
    }

    // BoardManager.js - обновить метод parseBoardsTxt
    // В BoardManager.js обновить метод parseBoardsTxt
    async parseBoardsTxt(platformPath, vendor, arch, version) {
        const boardsTxtPath = path.join(platformPath, 'boards.txt');
        if (!fs.existsSync(boardsTxtPath)) return;

        try {
            const content = fs.readFileSync(boardsTxtPath, 'utf8');
            const lines = content.split('\n');
            let currentBoardId = null;
            let boardInfo = {};
            let boardProperties = {};
            const coreId = `${vendor}:${arch}`;

            // Собираем все меню конфигурации
            const menuConfigs = new Map();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;

                // Улучшенное регулярное выражение для обработки всех свойств
                const match = trimmed.match(/^([^.]+)\.([^=]+)=(.+)$/);
                if (!match) continue;

                const [, boardId, property, value] = match;

                // Сохраняем все свойства для текущей платы
                if (!boardProperties[boardId]) {
                    boardProperties[boardId] = {};
                }
                boardProperties[boardId][property] = value;

                // Если это меню конфигурации, сохраняем отдельно
                if (property.startsWith('menu.')) {
                    const menuMatch = property.match(/^menu\.([^.]+)\.([^.]+)(?:\.(.+))?$/);
                    if (menuMatch) {
                        const [, menuName, optionKey, optionProperty] = menuMatch;

                        if (!menuConfigs.has(menuName)) {
                            menuConfigs.set(menuName, new Map());
                        }

                        const menuOptions = menuConfigs.get(menuName);
                        if (!menuOptions.has(optionKey)) {
                            menuOptions.set(optionKey, { label: value, properties: {} });
                        }

                        if (optionProperty) {
                            menuOptions.get(optionKey).properties[optionProperty] = value;
                        }
                    }
                }

                // Обрабатываем обычные свойства платы
                if (currentBoardId !== boardId) {
                    if (currentBoardId && boardInfo.name) {
                        // Сохраняем все свойства в объект boardInfo
                        boardInfo.properties = boardProperties[currentBoardId];
                        boardInfo.menuConfigs = this.extractMenuConfigs(menuConfigs, currentBoardId, boardProperties[currentBoardId]);
                        await this.saveBoard(vendor, arch, coreId, currentBoardId, boardInfo, version);
                    }
                    currentBoardId = boardId;
                    boardInfo = {};
                }

                // Ключевые свойства сохраняем отдельно
                switch(property) {
                    case 'name':
                        boardInfo.name = value;
                        break;
                    case 'build.board':
                        boardInfo.buildBoard = value;
                        break;
                    case 'build.mcu':
                        boardInfo.mcu = value;
                        break;
                    case 'build.f_cpu':
                        boardInfo.frequency = value;
                        break;
                    case 'upload.maximum_size':
                        boardInfo.maxSize = value;
                        break;
                    case 'upload.speed':
                        boardInfo.uploadSpeed = value;
                        break;
                    case 'upload.protocol':
                        boardInfo.uploadProtocol = value;
                        break;
                    case 'upload.tool':
                        boardInfo.uploadTool = value;
                        break;
                    case 'upload.programmer':
                        boardInfo.uploadProgrammer = value;
                        break;
                    case 'programmer':
                        boardInfo.programmer = value;
                        break;
                    case 'build.variant':
                        boardInfo.variant = value;
                        break;
                    case 'build.core':
                        boardInfo.core = value;
                        break;
                }
            }

            // Сохраняем последнюю плату
            if (currentBoardId && boardInfo.name) {
                boardInfo.properties = boardProperties[currentBoardId];
                boardInfo.menuConfigs = this.extractMenuConfigs(menuConfigs, currentBoardId, boardProperties[currentBoardId]);
                await this.saveBoard(vendor, arch, coreId, currentBoardId, boardInfo, version);
            }
        } catch (error) {
            console.error(`Error parsing boards.txt for ${vendor}:${arch}:`, error);
        }
    }

    // Новый метод для извлечения конфигураций меню
    extractMenuConfigs(menuConfigs, boardId, properties) {
        const boardMenuConfigs = {};

        for (const [menuName, menuOptions] of menuConfigs) {
            // Проверяем, есть ли для этой платы свойства, связанные с этим меню
            const menuPrefix = `menu.${menuName}.`;
            const hasMenuForBoard = Object.keys(properties).some(key => key.startsWith(menuPrefix));

            if (hasMenuForBoard) {
                boardMenuConfigs[menuName] = {
                    label: this.getMenuLabel(menuName),
                    options: Array.from(menuOptions.entries()).map(([key, value]) => ({
                        key,
                        label: value.label,
                        properties: value.properties
                    }))
                };
            }
        }

        return boardMenuConfigs;
    }

    getMenuLabel(menuName) {
        const translations = {
            'cpu': 'Процессор',
            'xtal': 'Частота процессора',
            'vt': 'Таблица векторов',
            'flash': 'Флеш-память',
            'programmer': 'Программатор',
            'clock': 'Тактовая частота',
            'board': 'Вариант платы',
            'speed': 'Скорость загрузки',
            'reset': 'Режим сброса',
            'debug': 'Режим отладки',
            'lwip': 'Сетевой стек',
            'stack': 'Размер стека',
            'variant': 'Вариант',
            'core': 'Ядро',
            'freq': 'Частота',
            'baud': 'Скорость порта',
            'port': 'Порт',
            'protocol': 'Протокол',
            'upload': 'Способ загрузки'
        };

        return translations[menuName] || this.capitalizeFirstLetter(menuName);
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // В методе saveBoard добавить передачу свойств
    // BoardManager.js - обновленный метод saveBoard
    async saveBoard(vendor, arch, coreId, boardId, boardInfo, version) {
        const fullBoardId = `${vendor}_${arch}_${boardId}`.toLowerCase();
        const fqbn = `${vendor}:${arch}:${boardId}`;
        const core = this.installedCores.get(coreId);

        // Получаем пины по умолчанию
        const pins = this.getDefaultPinsForBoard(boardId, arch);

        // Создаем объект платы
        const board = {
            id: fullBoardId,
            boardId: boardId,
            fqbn: fqbn,
            name: boardInfo.name || boardId,
            coreId: coreId,
            coreName: core?.name || coreId,
            vendor: vendor,
            architecture: arch,
            version: version,
            mcu: boardInfo.mcu,
            frequency: boardInfo.f_cpu || boardInfo.frequency,
            maxSize: boardInfo.maxSize,
            buildBoard: boardInfo.buildBoard,
            installed: true,
            category: core?.name || 'Другие',
            pins: pins,
            properties: boardInfo.properties || {},
            menuConfigs: boardInfo.menuConfigs || {},
            // В методе saveBoard обновим uploadSettings:
            uploadSettings: {
                speed: boardInfo.uploadSpeed ||
                       boardInfo.properties?.['upload.speed'] ||
                       '115200',
                protocol: boardInfo.uploadProtocol ||
                          boardInfo.properties?.['upload.protocol'] ||
                          'serial',
                // Для AVR плат программатор не указываем по умолчанию
                programmer: boardInfo.uploadProgrammer ||
                            boardInfo.programmer ||
                            boardInfo.uploadTool ||
                            (boardId.includes('esp') ? '' : ''),
                tool: boardInfo.uploadTool,
                variant: boardInfo.variant,
                cpu: boardInfo.mcu,
                core: boardInfo.core || boardInfo.properties?.['build.core']
            }
        };

        console.log(`Saved board ${fullBoardId}: ${board.name}`);
        console.log(`Processor: ${board.mcu}, Frequency: ${board.frequency}`);

        this.installedBoards.set(fullBoardId, board);

        if (!this.boardCategories.has(board.category)) {
            this.boardCategories.set(board.category, []);
        }
        this.boardCategories.get(board.category).push(board);
    }

    getDefaultPinsForBoard(boardId, architecture) {
        const boardIdLower = boardId.toLowerCase();
        const pinConfigs = {
            'uno': { digital: 14, analog: 6, pwm: [3,5,6,9,10,11] },
            'nano': { digital: 14, analog: 8, pwm: [3,5,6,9,10,11] },
            'mega': { digital: 54, analog: 16, pwm: [2,3,4,5,6,7,8,9,10,11,12,13] },
            'leonardo': { digital: 20, analog: 12, pwm: [3,5,6,9,10,11,13] },
            'micro': { digital: 20, analog: 12, pwm: [3,5,6,9,10,11,13] },
            'mini': { digital: 14, analog: 8, pwm: [3,5,6,9,10,11] },
            'esp32': { digital: 34, analog: 18, pwm: 'all' },
            'esp8266': { digital: 11, analog: 1, pwm: 'all' },
            'nodemcu': { digital: 11, analog: 1, pwm: 'all' },
            'mkr': { digital: 22, analog: 7, pwm: 'all' },
            'zero': { digital: 22, analog: 6, pwm: 'all' }
        };

        for (const [key, config] of Object.entries(pinConfigs)) {
            if (boardIdLower.includes(key)) {
                return config;
            }
        }

        return { digital: 14, analog: 6, pwm: [] };
    }

    async loadAdditionalUrls() {
        if (!this.arduino15Path) return;

        // Проверяем существование папки перед чтением конфига
        if (!fs.existsSync(this.arduino15Path)) {
            console.log('Arduino15 directory not found, skipping additional URLs load');
            this.additionalUrls = [];
            return;
        }

        const cliConfigPath = path.join(this.arduino15Path, 'arduino-cli.yaml');
        if (!fs.existsSync(cliConfigPath)) {
            this.additionalUrls = [];
            return;
        }

        try {
            const yaml = require('js-yaml');
            const configContent = fs.readFileSync(cliConfigPath, 'utf8');
            const config = yaml.load(configContent);

            if (config.board_manager && config.board_manager.additional_urls) {
                this.additionalUrls = Array.isArray(config.board_manager.additional_urls)
                    ? config.board_manager.additional_urls
                    : [];
            } else {
                this.additionalUrls = [];
            }

            console.log(`Loaded additional URLs: ${this.additionalUrls.length}`);
        } catch (error) {
            console.warn('Error reading arduino-cli.yaml:', error);
            this.additionalUrls = [];
        }
    }

    // Методы, требующие Arduino CLI, теперь проверяют его наличие
    async getAllAvailableCores() {
        // Проверяем наличие Arduino CLI
        if (!this.arduinoCliPath) {
            console.warn('Arduino CLI not available, returning empty cores list');
            return [];
        }

        try {
            const isVerified = await this.verifyArduinoCli();
            if (!isVerified) {
                console.warn('Arduino CLI not working, returning empty cores list');
                return [];
            }

            // Проверяем кэш
            const now = Date.now();
            if (this.availableCoresCache && this.availableCoresCacheTime &&
                (now - this.availableCoresCacheTime) < this.CACHE_DURATION) {
                console.log('Using cached available cores');
                return this.availableCoresCache;
            }

            console.log('Getting all available cores...');
            const command = `"${this.arduinoCliPath}" core search --format json`;
            const { stdout } = await execAsync(command, { timeout: 60000 });

            let platforms = [];
            try {
                const parsed = JSON.parse(stdout);
                console.log('Parsed JSON structure:', {
                    type: typeof parsed,
                    isArray: Array.isArray(parsed),
                    keys: Object.keys(parsed || {}),
                    platformsCount: parsed.platforms ? parsed.platforms.length : 0
                });

                // Извлекаем платформы из JSON ответа
                if (Array.isArray(parsed)) {
                    platforms = parsed;
                } else if (parsed && typeof parsed === 'object' && parsed.platforms && Array.isArray(parsed.platforms)) {
                    platforms = parsed.platforms;
                } else {
                    console.warn('Unexpected JSON structure, using empty array');
                }

                console.log(`Found ${platforms.length} platforms (cores)`);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                // Fallback: парсим текстовый вывод
                const lines = stdout.split('\n').filter(line => line.trim());
                platforms = this.parseTextOutputToCores(lines);
            }

            const formattedCores = platforms.map(platform => {
                // Обрабатываем структуру платформы
                let coreId = platform.id || '';
                let coreName = platform.name || '';
                let description = platform.description || '';
                let latestVersion = '';
                let installed = platform.installed || false;

                // Извлекаем последнюю версию из releases
                latestVersion = this.extractLatestVersion(platform);

                // Если нет имени, пытаемся извлечь из последнего релиза
                if (!coreName && platform.releases && latestVersion) {
                    const latestRelease = platform.releases[latestVersion];
                    if (latestRelease && latestRelease.name) {
                        coreName = latestRelease.name;
                    }
                }

                // Если все еще нет имени, используем ID
                if (!coreName) {
                    coreName = coreId;
                    // Форматируем имя из ID: vendor:arch -> Arch (Vendor)
                    if (coreId.includes(':')) {
                        const parts = coreId.split(':');
                        if (parts.length >= 2) {
                            coreName = `${parts[1].toUpperCase()} (${parts[0]})`;
                        }
                    }
                }

                // Форматируем описание
                if (!description && platform.releases && latestVersion) {
                    const latestRelease = platform.releases[latestVersion];
                    if (latestRelease && latestRelease.summary) {
                        description = latestRelease.summary;
                    }
                }

                return {
                    id: coreId,
                    name: coreName,
                    installed: installed,
                    latestVersion: latestVersion || 'unknown',
                    description: description.substring(0, 200) || 'Нет описания'
                };
            }).filter(core => core.id && core.name);

            console.log(`Formatted ${formattedCores.length} available cores`);

            // Кэшируем результат
            this.availableCoresCache = formattedCores;
            this.availableCoresCacheTime = now;

            return formattedCores;
        } catch (error) {
            console.error('Error getting available cores:', error);
            // Возвращаем кэшированные данные, если есть
            if (this.availableCoresCache) {
                console.log('Returning cached cores due to error');
                return this.availableCoresCache;
            }
            return [];
        }
    }

    // Извлекаем последнюю версию
    extractLatestVersion(platform) {
        if (!platform.releases || typeof platform.releases !== 'object') {
            return '';
        }

        const releases = platform.releases;
        const versions = Object.keys(releases);

        if (versions.length === 0) {
            return '';
        }

        // Сортируем версии в порядке убывания
        versions.sort((a, b) => {
            const aParts = a.split('.').map(part => {
                // Обрабатываем версии типа "1.8.6-1"
                const match = part.match(/^(\d+)(?:-(\d+))?$/);
                if (match) {
                    return parseInt(match[1]) * 1000 + (parseInt(match[2]) || 0);
                }
                return parseInt(part) || 0;
            });

            const bParts = b.split('.').map(part => {
                const match = part.match(/^(\d+)(?:-(\d+))?$/);
                if (match) {
                    return parseInt(match[1]) * 1000 + (parseInt(match[2]) || 0);
                }
                return parseInt(part) || 0;
            });

            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aVal = aParts[i] || 0;
                const bVal = bParts[i] || 0;
                if (aVal !== bVal) {
                    return bVal - aVal; // По убыванию
                }
            }
            return 0;
        });

        return versions[0];
    }

    // Парсим текстовый вывод
    parseTextOutputToCores(lines) {
        const cores = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Пропускаем заголовки, разделители и пустые строки
            if (!trimmed ||
                trimmed.includes('---') ||
                trimmed === 'ID' ||
                trimmed.startsWith('===') ||
                (trimmed.includes('ID') && trimmed.includes('Latest') && trimmed.includes('Installed'))) {
                continue;
            }

            // Пытаемся разобрать строку в формате таблицы
            const match = trimmed.match(/^(\S+)\s+(\S.+?)\s+(\S+)\s+(\S+)\s+(.*)$/);

            if (match) {
                const [, id, name, installed, latest, description] = match;
                cores.push({
                    id: id.trim(),
                    name: name.trim(),
                    installed: installed.trim().toUpperCase() === 'INSTALLED',
                    latestVersion: latest.trim(),
                    description: description.trim()
                });
            } else {
                // Альтернативный формат: разделение по двум или более пробелам
                const parts = trimmed.split(/\s{2,}/).filter(p => p && p.trim());

                if (parts.length >= 3) {
                    const core = {
                        id: parts[0] || '',
                        name: parts[1] || '',
                        installed: false,
                        latestVersion: '',
                        description: ''
                    };

                    // Определяем, установлено ли ядро
                    for (let i = 2; i < parts.length; i++) {
                        if (parts[i].includes('INSTALLED')) {
                            core.installed = true;
                            core.latestVersion = parts[i].replace('INSTALLED', '').trim();
                        } else if (parts[i].match(/^\d+\.\d+\.\d+/)) {
                            core.latestVersion = parts[i];
                        } else {
                            core.description += parts[i] + ' ';
                        }
                    }

                    cores.push(core);
                }
            }
        }

        return cores;
    }

    async uninstallCore(coreId) {
        // Проверяем наличие Arduino CLI
        if (!this.arduinoCliPath) {
            return {
                success: false,
                error: 'Arduino CLI not found',
                message: 'Arduino CLI не найден. Установите Arduino CLI для управления ядрами.'
            };
        }

        try {
            const isVerified = await this.verifyArduinoCli();
            if (!isVerified) {
                return {
                    success: false,
                    error: 'Arduino CLI not working',
                    message: 'Arduino CLI не работает. Проверьте установку.'
                };
            }

            console.log(`Uninstalling core: ${coreId}`);
            const command = `"${this.arduinoCliPath}" core uninstall ${coreId}`;

            const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

            // Сбрасываем кэши
            this.availableCoresCache = null;
            this.availableCoresCacheTime = null;

            await this.scanArduino15();

            return {
                success: true,
                stdout,
                stderr,
                message: `Ядро ${coreId} успешно удалено`
            };
        } catch (error) {
            console.error(`Error uninstalling core ${coreId}:`, error);
            return {
                success: false,
                error: error.message,
                message: `Ошибка удаления ядра ${coreId}: ${error.message}`
            };
        }
    }

    async searchCores(searchTerm) {
        // Проверяем наличие Arduino CLI
        if (!this.arduinoCliPath) {
            console.warn('Arduino CLI not available for search');
            return [];
        }

        try {
            const isVerified = await this.verifyArduinoCli();
            if (!isVerified) {
                return [];
            }

            console.log(`Searching cores: ${searchTerm}`);
            const command = `"${this.arduinoCliPath}" core search ${searchTerm} --format json`;
            const { stdout } = await execAsync(command, { timeout: 30000 });

            const cores = JSON.parse(stdout);
            return cores.map(core => ({
                id: core.id || '',
                name: core.name || core.id || '',
                installed: core.installed || false,
                latestVersion: core.latest || '',
                description: core.description || ''
            }));
        } catch (error) {
            console.error('Error searching cores:', error);
            return [];
        }
    }

    async getAvailableCores() {
        return this.getAllAvailableCores();
    }

    async removeAdditionalUrl(url) {
        if (!url) return false;

        const index = this.additionalUrls.indexOf(url);
        if (index === -1) return false;

        this.additionalUrls.splice(index, 1);
        await this.saveAdditionalUrls();

        return true;
    }

    async getAdditionalUrls() {
        await this.loadAdditionalUrls();
        return this.additionalUrls;
    }

    getBoardCategories() {
        const categories = new Map();

        // Получаем все платы (включая встроенные)
        const allBoards = this.getAllBoards();

        // Группируем платы по категориям
        allBoards.forEach(board => {
            const category = board.category || 'Другие';

            if (!categories.has(category)) {
                categories.set(category, []);
            }

            categories.get(category).push(board);
        });

        // Сортируем категории: встроенные платы идут первыми
        const sortedCategories = new Map(
            Array.from(categories.entries()).sort(([catA, boardsA], [catB, boardsB]) => {
                // Категория "Встроенные платы" идет первой
                if (catA === 'Встроенные платы') return -1;
                if (catB === 'Встроенные платы') return 1;

                // Затем по количеству плат в категории (убывание)
                if (boardsA.length !== boardsB.length) {
                    return boardsB.length - boardsA.length;
                }

                // Затем по алфавиту
                return catA.localeCompare(catB);
            })
        );

        // Сортируем платы внутри каждой категории
        sortedCategories.forEach((boards, category) => {
            boards.sort((a, b) => {
                // Встроенные платы идут первыми внутри категории
                if (a.isBuiltIn && !b.isBuiltIn) return -1;
                if (!a.isBuiltIn && b.isBuiltIn) return 1;

                // Затем по алфавиту
                return a.name.localeCompare(b.name);
            });
        });

        console.log(`Returning ${sortedCategories.size} categories with ${allBoards.length} boards`);
        return sortedCategories;
    }
    // Обновляем метод getAllBoards()
    getAllBoards() {
        // Получаем установленные платы
        const installedBoards = Array.from(this.installedBoards.values());

        // Получаем встроенные платы из конфигурации
        const builtinBoards = this.configManager.getAllBuiltinBoards();

        // Объединяем платы, убирая дубликаты по ID
        const allBoardsMap = new Map();

        // Сначала добавляем установленные платы
        installedBoards.forEach(board => {
            allBoardsMap.set(board.id, board);
        });

        // Затем добавляем встроенные платы (перезаписывая если есть дубликат)
        builtinBoards.forEach(board => {
            allBoardsMap.set(board.id, {
                ...board,
                isBuiltIn: true // Добавляем флаг, что это встроенная плата
            });
        });

        console.log(`Returning ${allBoardsMap.length} boards (${builtinBoards.length} builtin, ${installedBoards.length} installed)`);
        return allBoardsMap;
    }

    getBoardConfig(boardId) {
        return this.getBoard(boardId);
    }

    // В методе getBoard в BoardManager.js добавьте:
    getBoard(boardId) {
        // 1. Проверяем установленные платы
        if (this.installedBoards.has(boardId)) {
            return this.installedBoards.get(boardId);
        }

        // 2. Проверяем встроенные платы из конфигурации
        const builtinBoard = this.configManager.getBuiltinBoard(boardId);
        if (builtinBoard) {
            console.log(`Found builtin board: ${boardId}`);
            return builtinBoard;
        }

        console.warn(`Board not found: ${boardId}`);
        return null;
    }



    async addAdditionalUrl(url) {
        if (!url || this.additionalUrls.includes(url)) {
            return false;
        }

        this.additionalUrls.push(url);
        await this.saveAdditionalUrls();

        return true;
    }

    async saveAdditionalUrls() {
        if (!this.arduino15Path) return false;

        // Проверяем существование папки перед записью
        if (!fs.existsSync(this.arduino15Path)) {
            console.log('Arduino15 directory not found, skipping save additional URLs');
            return false;
        }

        const cliConfigPath = path.join(this.arduino15Path, 'arduino-cli.yaml');

        try {
            const yaml = require('js-yaml');
            let config = {};

            if (fs.existsSync(cliConfigPath)) {
                const configContent = fs.readFileSync(cliConfigPath, 'utf8');
                config = yaml.load(configContent) || {};
            }

            if (!config.board_manager) {
                config.board_manager = {};
            }

            config.board_manager.additional_urls = this.additionalUrls;

            const yamlContent = yaml.dump(config, { lineWidth: -1 });
            fs.writeFileSync(cliConfigPath, yamlContent, 'utf8');

            return true;
        } catch (error) {
            console.error('Error saving additional URLs:', error);
            return false;
        }
    }

    async getInstalledCoresFast() {
        try {
            const cores = Array.from(this.installedCores.values()).map(core => ({
                id: core.id,
                installedVersion: core.version,
                latestVersion: core.version,
                name: core.name
            }));

            console.log(`Returning ${cores.length} installed cores from fast cache`);
            return { success: true, cores };
        } catch (error) {
            console.error('Error in getInstalledCoresFast:', error);
            return { success: false, error: error.message };
        }
    }

    async getAdditionalUrlsFast() {
        try {
            await this.loadAdditionalUrls();
            return { success: true, urls: this.additionalUrls };
        } catch (error) {
            console.error('Error in getAdditionalUrlsFast:', error);
            return { success: false, error: error.message };
        }
    }

    async getInstalledCores() {
        // Если нет Arduino CLI, возвращаем локально найденные ядра
        if (!this.arduinoCliPath) {
            console.log('Arduino CLI not available, returning locally scanned cores');
            const cores = Array.from(this.installedCores.values()).map(core => ({
                id: core.id,
                installedVersion: core.version,
                latestVersion: core.version,
                name: core.name
            }));
            console.log(`Returning ${cores.length} cores from local scan`);
            return cores;
        }

        try {
            const isVerified = await this.verifyArduinoCli();
            if (!isVerified) {
                throw new Error('Arduino CLI not working');
            }

            console.log('Getting installed cores from arduino-cli...');
            const command = `"${this.arduinoCliPath}" core list --format json`;
            const { stdout } = await execAsync(command, { timeout: 30000 });

            try {
                const cores = JSON.parse(stdout);
                console.log(`Got ${cores.length} installed cores from arduino-cli`);
                return cores;
            } catch (parseError) {
                console.warn('Failed to parse core list JSON:', parseError);
                const cores = Array.from(this.installedCores.values()).map(core => ({
                    id: core.id,
                    installedVersion: core.version,
                    latestVersion: core.version,
                    name: core.name
                }));

                console.log(`Returning ${cores.length} cores from local scan`);
                return cores;
            }
        } catch (error) {
            console.error('Error getting installed cores:', error);
            const cores = Array.from(this.installedCores.values()).map(core => ({
                id: core.id,
                installedVersion: core.version,
                latestVersion: core.version,
                name: core.name
            }));

            console.log(`Returning ${cores.length} cores as fallback`);
            return cores;
        }
    }

    async installCore(coreId) {
        // Проверяем наличие Arduino CLI
        if (!this.arduinoCliPath) {
            return {
                success: false,
                error: 'Arduino CLI not found',
                message: 'Arduino CLI не найден. Для установки ядер:',
                suggestManual: true,
                manualInstructions: `Для установки ядра ${coreId}:
1. Скачайте Arduino CLI с https://github.com/arduino/arduino-cli/releases
2. Поместите arduino-cli.exe (Windows) или arduino-cli (Linux/macOS) в папку приложения
3. Перезапустите приложение
4. Установите ядро через интерфейс приложения

Или вручную через командную строку:
arduino-cli core install ${coreId}`
            };
        }

        try {
            const isVerified = await this.verifyArduinoCli();
            if (!isVerified) {
                return {
                    success: false,
                    error: 'Arduino CLI not working',
                    message: 'Arduino CLI найден, но не работает. Проверьте установку.',
                    suggestManual: true,
                    manualInstructions: `Для установки ядра ${coreId} вручную:
1. Откройте командную строку
2. Перейдите в папку с arduino-cli
3. Выполните команду: arduino-cli core install ${coreId}`
                };
            }

            console.log(`Installing core: ${coreId}`);

            // Используем spawn для контроля процесса
            const { spawn } = require('child_process');

            return new Promise((resolve, reject) => {
                const args = ['core', 'install', coreId];
                const child = spawn(this.arduinoCliPath.replace(/"/g, ''), args, {
                    shell: process.platform === 'win32',
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let stdout = '';
                let stderr = '';
                let progress = '';
                let lastProgressUpdate = Date.now();

                child.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    progress += output;

                    // Отправляем прогресс каждые 500мс
                    const now = Date.now();
                    if (now - lastProgressUpdate > 500) {
                        lastProgressUpdate = now;
                        console.log('Core install progress:', output.trim());

                        // Извлекаем прогресс загрузки
                        const progressMatch = output.match(/(\d+\.\d+)\s*(MiB|KiB)/);
                        if (progressMatch) {
                            console.log(`Download progress: ${progressMatch[1]} ${progressMatch[2]}`);
                        }
                    }
                });

                child.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    console.error('Core install stderr:', output.trim());
                });

                child.on('close', (code) => {
                    console.log(`Core install process exited with code ${code}`);

                    if (code === 0) {
                        // Сбрасываем кэши
                        this.availableCoresCache = null;
                        this.availableCoresCacheTime = null;

                        // Пересканируем Arduino15 (теперь папка должна существовать)
                        setTimeout(() => {
                            this.scanArduino15().then(() => {
                                console.log('Arduino15 rescanned after core installation');
                            });
                        }, 3000);

                        resolve({
                            success: true,
                            stdout,
                            stderr,
                            message: `Ядро ${coreId} успешно установлено`
                        });
                    } else {
                        const error = new Error(`Core installation failed with code ${code}`);
                        console.error(`Error installing core ${coreId}:`, error.message);
                        reject(error);
                    }
                });

                child.on('error', (error) => {
                    console.error(`Error spawning core install process for ${coreId}:`, error);
                    reject(error);
                });

                // Таймаут 30 минут для очень больших ядер
                const timeout = setTimeout(() => {
                    if (child.exitCode === null) {
                        child.kill();
                        const timeoutError = new Error('Установка ядра заняла слишком много времени (30 минут). Проверьте интернет-соединение.');
                        console.error(`Timeout installing core ${coreId}:`, timeoutError.message);
                        reject(timeoutError);
                    }
                }, 1800000); // 30 минут

                // Отменяем таймаут при завершении процесса
                child.on('close', () => {
                    clearTimeout(timeout);
                });
            });
        } catch (error) {
            console.error(`Error installing core ${coreId}:`, error);

            let errorMessage = error.message;
            let suggestManual = false;

            if (error.message.includes('timeout') || error.message.includes('слишком много времени')) {
                errorMessage = 'Установка заняла слишком много времени. Ядро очень большое (346 МБ). Рекомендуется:';
                suggestManual = true;
            }

            return {
                success: false,
                error: error.message,
                message: errorMessage,
                suggestManual: suggestManual,
                manualInstructions: `Для установки ядра ${coreId} вручную:
    1. Откройте командную строку (CMD или PowerShell)
    2. Выполните команду: arduino-cli core install ${coreId}
    3. Дождитесь завершения (может занять 10-20 минут при медленном интернете)`
            };
        }
    }

    async updateCoreIndex() {
        // Проверяем наличие Arduino CLI
        if (!this.arduinoCliPath) {
            return {
                success: false,
                error: 'Arduino CLI not found',
                message: 'Arduino CLI не найден. Обновление индекса невозможно.'
            };
        }

        try {
            const isVerified = await this.verifyArduinoCli();
            if (!isVerified) {
                return {
                    success: false,
                    error: 'Arduino CLI not working',
                    message: 'Arduino CLI не работает. Обновление индекса невозможно.'
                };
            }

            // Сбрасываем кэш доступных ядер
            this.availableCoresCache = null;
            this.availableCoresCacheTime = null;

            const command = `"${this.arduinoCliPath}" core update-index`;
            const { stdout, stderr } = await execAsync(command, { timeout: 120000 });

            return {
                success: true,
                stdout,
                stderr
            };
        } catch (error) {
            console.error('Error updating core index:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async diagnose() {
        const result = {
            success: true,
            arduino15Path: this.arduino15Path,
            arduinoCliPath: this.arduinoCliPath,
            arduinoCliValid: false,
            installedBoardsCount: this.installedBoards.size,
            installedCoresCount: this.installedCores.size,
            categoriesCount: this.boardCategories.size,
            additionalUrls: this.additionalUrls.length,
            commands: []
        };

        // Проверяем Arduino CLI, если он есть
        if (this.arduinoCliPath) {
            try {
                const isVerified = await this.verifyArduinoCli();
                result.arduinoCliValid = isVerified;

                if (isVerified) {
                    const commands = [
                        { name: 'version', cmd: `"${this.arduinoCliPath}" version` },
                        { name: 'core list', cmd: `"${this.arduinoCliPath}" core list` },
                        { name: 'config dump', cmd: `"${this.arduinoCliPath}" config dump` }
                    ];

                    for (const cmd of commands) {
                        try {
                            const { stdout } = await execAsync(cmd.cmd, { timeout: 10000 });
                            result.commands.push({
                                name: cmd.name,
                                success: true,
                                output: stdout.substring(0, 200) + '...'
                            });
                        } catch (error) {
                            result.commands.push({
                                name: cmd.name,
                                success: false,
                                error: error.message
                            });
                        }
                    }
                }
            } catch (error) {
                result.arduinoCliValid = false;
                result.commands.push({
                    name: 'verify',
                    success: false,
                    error: error.message
                });
            }
        } else {
            result.arduinoCliValid = false;
            result.commands.push({
                name: 'verify',
                success: false,
                error: 'Arduino CLI not found'
            });
        }

        return result;
    }

    // Очистка кэша доступных ядер
    clearAvailableCoresCache() {
        this.availableCoresCache = null;
        this.availableCoresCacheTime = null;
        console.log('Available cores cache cleared');
    }

    // Новый метод для проверки наличия Arduino CLI
    hasArduinoCli() {
        return !!this.arduinoCliPath;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardManager;
}