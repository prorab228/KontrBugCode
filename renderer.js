
// Инициализация глобальных менеджеров
window.AppController = null;
window.ProjectStateManager = new ProjectStateManager();
window.CompilationManager = new CompilationManager();
// Глобальные переменные для core модулей
window.BlockParser = BlockParser;
window.LibraryManager = LibraryManager;
window.HelperGenerator = HelperGenerator;
window.InitializationGenerator = InitializationGenerator;
window.CodeGenerator = CodeGenerator;


console.log('Renderer: Global modules initialized', {
    CodeGenerator: !!window.CodeGenerator,
    workspace: !!window.workspace
});

// Проверяем окружение
if (typeof require !== 'undefined' && !window.ipcRenderer) {
    window.ipcRenderer = require('electron').ipcRenderer;
}

class AppController {
    constructor() {

        this.APP_VERSION = '1.0.7 Beta';
        this.APP_AUTHOR = 'Лунев Валерий Константинович ';

        this.workspace = null;
        this.initialized = false;
        this.workspaceReady = false;
        this.recentProjects = JSON.parse(localStorage.getItem('recentProjects') || '[]');
        this.currentProjectPath = null;
        this.currentCode = '';
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('Initializing app...');

            await this.initializeManagers();
            this.setupEventListeners();

            // Инициализируем ProjectStateManager
            if (window.ProjectStateManager) {
                window.ProjectStateManager = new ProjectStateManager();
                await window.ProjectStateManager.init();
            }

            // Устанавливаем номер версии
            document.getElementById('version').innerHTML = `<strong>Версия:</strong> ${this.APP_VERSION}`;

            this.updateRecentProjectsMenu();

            // Если проект не был восстановлен, загружаем пример
            if (!window.ProjectStateManager?.wasProjectRestored()) {
                setTimeout(() => {
                    if (window.loadExample && !window.ProjectStateManager?.projectLoaded) {
                        console.log('Loading default example...');
                        window.loadExample('blink');
                        window.ProjectStateManager.projectLoaded = true;
                    }
                }, 2000);
            }

            this.initialized = true;
            console.log('App initialized successfully');

        } catch (error) {
            console.error('App initialization failed:', error);
        }
    }

    async initializeManagers() {
        // Сначала проверяем, что CodeGenerator доступен
        if (!window.CodeGenerator) {
            console.error('CodeGenerator not found! Check script loading order.');
            // Пробуем подождать и проверить еще раз
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!window.CodeGenerator) {
                console.error('CodeGenerator still not available after wait');
            }
        }

        const managers = [
            { name: 'BoardUIManager', init: 'init' },
            { name: 'ConnectionHelper', init: 'init' },
            { name: 'ThemeManager', init: 'init' },
            { name: 'UIManager', init: 'init' },
            { name: 'SerialManager', init: 'init' },
            { name: 'CodeToBlocksConverter', init: 'init' },
            { name: 'UploadManager', init: 'init' },
            { name: 'SimulatorManager', init: 'init' },
            { name: 'LogManager', init: 'init' }
        ];

        // Инициализируем BoardUIManager первым
//        if (window.BoardUIManager) {
//          window.BoardUIManagerInstance = new window.BoardUIManager();
//          await window.BoardUIManagerInstance.init();
//          window.BoardUIManager = window.BoardUIManagerInstance;
//        }

        // Инициализируем менеджеры
        for (const { name, init } of managers) {
            if (window[name] && typeof window[name][init] === 'function') {
                await this.initializeManager(name, init);
            } else {
                console.warn(`Manager ${name} or method ${init} not found`);
            }
        }

        // Инициализируем BlocklyManager отдельно
        if (window.BlocklyManager && typeof window.BlocklyManager.initializeBlockly === 'function') {
            await this.initializeManager('BlocklyManager', 'initializeBlockly');
        }

        if (window.CodeEditor && typeof window.CodeEditor.init === 'function') {
            await window.CodeEditor.init();
        }

        if (this.workspace) {
            this.workspaceReady = true;
            console.log('Workspace is ready');
        }

        if (window.BoardManager && window.workspace) {
            setTimeout(() => {
                window.BoardManager.updateAllBlocks();
            }, 500);
        }

        console.log('All managers initialized');
    }

    async initializeManager(managerName, initMethod) {
        try {
            const manager = window[managerName];

            if (managerName === 'BlocklyManager') {
                this.workspace = manager[initMethod]();
                window.workspace = this.workspace;

                if (this.workspace) {
                    this.workspace.addChangeListener((event) => {
                        if (!event.isUiEvent && window.CodeGenerator) {
                            setTimeout(() => this.generateCode(), 100);
                            window.ProjectStateManager?.saveProjectState();
                        }
                    });
                    console.log('Blockly workspace created and listener added');
                }
            } else if (typeof manager[initMethod] === 'function') {
                await manager[initMethod]();
            }

            console.log(`${managerName} initialized successfully`);
        } catch (error) {
            console.error(`Error initializing ${managerName}:`, error);
        }
    }

    setupEventListeners() {
        this.setupIpcListeners();
        this.setupGlobalEventListeners();
        this.setupKeyboardShortcuts();

        // Инициализация UI компонентов после загрузки
        setTimeout(() => {
            this.initializeUIComponents();
        }, 2000);
    }


    initializeUIComponents() {
        console.log('Initializing UI components...');

        // Инициализация BoardUIManager
        if (window.initializeBoardUIManager) {
            window.initializeBoardUIManager();
        }

        // Обновление статуса Arduino CLI
        this.updateCLIStatus();
    }

    async updateCLIStatus() {
        try {
            const hasCLI = await this.checkArduinoCLI();
            const installBtn = document.getElementById('installCliBtn');

            if (installBtn) {
                installBtn.style.display = hasCLI ? 'none' : 'flex';
            }

            // Обновляем статус
            if (window.UIManager && window.UIManager.setStatus) {
                //const boardInfo = window.boardUIManager ? window.boardUIManager.getBoardInfo() : 'Готов к работе';
                const cliStatus = hasCLI ? 'Arduino CLI: ✓' : 'Arduino CLI: ✗';
            }
        } catch (error) {
            console.error('Error updating CLI status:', error);
        }
    }

    showLogWindow() {
        window.LogManager?.toggleLogWindow();
    }

    setupIpcListeners() {
        if (!window.ipcRenderer) {
            console.warn('ipcRenderer not available');
            return;
        }

        const ipcHandlers = {
            'menu-new-project': () => this.clearWorkspace(),
            'menu-open-project-dialog': () => this.openProject(),
            'menu-save-project': () => this.saveProject(),
            'menu-save-project-as': () => this.saveProjectAs(),
            'menu-export-sketch': () => this.exportSketch(),
            'menu-compile': () => this.compileSketch(),
            'menu-upload': () => this.showUploadModal(),
            'menu-board-settings': () => window.currentBoardSettings.showModal('currentBoardSettingsModal'),
            'insert-include': (event, libraryName) => this.insertInclude(event, libraryName),
            'load-example': (event, data) => this.loadInoExample(event, data),
            'auto-save-request': () => window.ProjectStateManager.saveProjectState(),
            'load-recent-project': (event, filePath) => this.loadRecentProject(filePath),
            'clear-recent-projects': () => this.clearRecentProjects(),
            'menu-show-logs': () => this.showLogWindow(),
            'menu-toggle-theme': () => window.ThemeManager?.toggleTheme(),
            'upload-progress': (event, data) => window.UploadManager?.handleUploadProgress(data),
            // В setupIpcListeners() добавить:
            'menu-board-management': () => window.boardManagementModal.showModal(),
            'menu-open-simulator': () => window.openSimulator(),
            'boards-config-loaded': (event, configData) => {
                console.log('Boards config loaded from main process');
                // Сохраняем в localStorage для доступа в BoardUIManager
                localStorage.setItem('boardsConfig', JSON.stringify({
                    boards: configData.boards,
                    userBoards: configData.userBoards
                }));
                localStorage.setItem('coresConfig', JSON.stringify({
                    cores: configData.cores
                }));
            },

            'boards-config-updated': (event, configData) => {
                console.log('Boards config updated from main process');
                localStorage.setItem('boardsConfig', JSON.stringify(configData));

                // Обновляем UI если BoardUIManager инициализирован
                if (window.BoardUIManager && window.BoardUIManager.instance) {
                    window.BoardUIManager.instance.populateAllSelects();
                }
            }

        };

        Object.entries(ipcHandlers).forEach(([event, handler]) => {
            window.ipcRenderer.on(event, handler);
        });

        console.log('IPC listeners setup complete');
    }

    setupGlobalEventListeners() {
        document.addEventListener('click', (e) => {
            if (window.UIManager?.hideAutocomplete) {
                const editor = document.getElementById('codeEditor');
                const autocomplete = document.querySelector('.autocomplete-container');

                if (editor && !editor.contains(e.target) && autocomplete && !autocomplete.contains(e.target)) {
                    window.UIManager.hideAutocomplete();
                }
            }
        });

//        // Обработчик изменения платы
//        // Обработчик изменения основной платы
//        const boardSelect = document.getElementById('boardSelect');
//        if (boardSelect) {
//            boardSelect.addEventListener('change', (e) => {
//                const boardType = e.target.value;
//                if (window.BoardManager) {
//                    window.BoardManager.currentBoardType = boardType;
//                    window.BoardManager.updateAllBlocks();
//                    window.BoardManager.saveState();
//
//                    // Обновляем статус
//                    if (window.UIManager) {
//                        window.UIManager.setStatus(window.BoardManager.getBoardInfo());
//                    }
//                }
//            });
//        }


    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    handleKeyboardShortcuts(e) {
        if (window.UIManager?.isAutocompleteVisible) {
            this.handleAutocompleteNavigation(e);
        }

        this.handleCopyShortcut(e);

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            window.ProjectStateManager.saveProjectState();
            window.UIManager?.showNotification('Проект сохранен');
        }
    }

    handleAutocompleteNavigation(e) {
        const items = document.querySelectorAll('.autocomplete-item');
        const { key } = e;

        if (['ArrowDown', 'ArrowUp', 'Escape'].includes(key)) {
            e.preventDefault();

            switch(key) {
                case 'ArrowDown':
                    window.UIManager.selectedSuggestionIndex = Math.min(
                        window.UIManager.selectedSuggestionIndex + 1,
                        items.length - 1
                    );
                    break;
                case 'ArrowUp':
                    window.UIManager.selectedSuggestionIndex = Math.max(
                        window.UIManager.selectedSuggestionIndex - 1,
                        0
                    );
                    break;
                case 'Escape':
                    window.UIManager.hideAutocomplete();
                    return;
            }

            window.UIManager.updateAutocompleteSelection();
        }
    }

    handleCopyShortcut(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const activeElement = document.activeElement;
            const codeOutput = document.getElementById('codeOutput');

            if (codeOutput && (activeElement === codeOutput || codeOutput.contains(activeElement))) {
                this.copyCode();
                e.preventDefault();
            }
        }
    }

    // Core methods
     async generateCode() {
        try {
            if (!window.UIManager) {
                console.warn('UIManager not available');
                return;
            }

            if (window.CodeGenerator && this.workspace) {
                this.currentCode = window.CodeGenerator.generateCodeFromBlocks(this.workspace);
                console.log('Code generated successfully');

                if (window.UIManager) {
                    window.UIManager.updateCodeOutput(this.currentCode);
                    window.UIManager.showNotification('Код успешно сгенерирован!');
                }

                if (window.ProjectStateManager) {
                    window.ProjectStateManager.saveProjectState();
                }
            } else {
                console.error('CodeGenerator or workspace not available', {
                    CodeGenerator: !!window.CodeGenerator,
                    workspace: !!this.workspace
                });
                this.currentCode = '// Ошибка: CodeGenerator или workspace не доступны';

                if (window.UIManager) {
                    window.UIManager.updateCodeOutput(this.currentCode);
                    window.UIManager.showNotification('Ошибка генерации кода', true);
                }
            }
        } catch (error) {
            console.error('Error generating code:', error);
            if (window.UIManager) {
                window.UIManager.showNotification('Ошибка генерации кода: ' + error.message, true);
            }
        }
    }

    compileSketch() {
        return window.CompilationManager.compileSketch();
    }

//    async uploadSketch() {
//        return window.CompilationManager.uploadSketch();
//    }


    // Project management
    async saveProject() {
        if (!window.UIManager || !window.ipcRenderer) return;

        try {
            const projectData = {
                blocks: Blockly.serialization.workspaces.save(this.workspace),
                code: window.UIManager.getCurrentCode(),
                timestamp: new Date().toISOString(),
                board: window.UIManager.getSelectedBoard()
            };

            const result = await window.ipcRenderer.invoke('save-project', {
                data: JSON.stringify(projectData, null, 2),
                filename: `project_${Date.now()}.cbp`
            });

            if (result.success) {
                this.currentProjectPath = result.path;
                this.addToRecentProjects(result.path);
                window.UIManager.showNotification('Проект сохранен: ' + result.path);
            }
        } catch (error) {
            window.UIManager.showNotification('Ошибка сохранения проекта: ' + error.message, true);
        }
    }

    async saveProjectAs() {
        return this.saveProject();
    }

    async openProject() {
        if (!window.UIManager || !window.ipcRenderer) return;

        try {
            const result = await window.ipcRenderer.invoke('open-project');
            if (result.success) {
                await this.loadProject(result.filePath, result.data);
            }
        } catch (error) {
            window.UIManager.showNotification('Ошибка открытия проекта: ' + error.message, true);
        }
    }

    // В методе loadProject добавьте:
    async loadProject(filePath, data) {
        try {
            const projectData = JSON.parse(data);

            if (this.workspace && projectData.blocks) {
                this.workspace.clear();

                // Загружаем блоки
                Blockly.serialization.workspaces.load(projectData.blocks, this.workspace);

                // Вызываем синхронизацию функций через некоторое время
                setTimeout(() => {
                    if (window.syncFunctionCalls) {
                        window.syncFunctionCalls();
                    }
                }, 2000); // Увеличил время для полной загрузки
            }

            if (projectData.code && window.UIManager) {
                window.UIManager.updateCodeOutput(projectData.code);
            }

            if (projectData.board && window.UIManager) {
                const boardSelect = document.getElementById('boardSelect');
                if (boardSelect) boardSelect.value = projectData.board;
            }

            this.currentProjectPath = filePath;
            this.addToRecentProjects(filePath);
            window.UIManager?.showNotification('Проект загружен: ' + filePath);
            window.ProjectStateManager.saveProjectState();

        } catch (error) {
            console.error('Error loading project:', error);
            window.UIManager?.showNotification('Ошибка загрузки проекта: ' + error.message, true);
        }
    }

    async exportSketch() {
        if (!window.UIManager || !window.ipcRenderer) return;

        const code = window.UIManager.getCurrentCode();

        if (!code || !code.trim()) {
            window.UIManager.showNotification('Сначала создайте или введите код!', true);
            return;
        }

        try {
            const result = await window.ipcRenderer.invoke('save-sketch', {
                code: code,
                filename: `sketch_${Date.now()}.ino`
            });

            if (result.success) {
                window.CompilationManager.setSketchPath(result.path);
                window.UIManager.showNotification('Скетч экспортирован: ' + result.path);
            } else if (result.error !== 'Отменено пользователем') {
                window.UIManager.showNotification('Ошибка экспорта: ' + result.error, true);
            }
        } catch (error) {
            window.UIManager.showNotification('Ошибка: ' + error.message, true);
        }
    }

    // UI methods
        async showUploadModal() {
        if (!window.ipcRenderer) return;

        try {
            window.UIManager?.setStatus('Поиск COM-портов...');
            await window.UploadManager.showUploadModal();
            //window.UIManager?.setStatus('Готов к работе');
           // window.UIManager?.setStatus(window.boardUIManager.getBoardInfo());
        } catch (error) {
            console.error('Error loading ports:', error);
            window.UIManager?.showNotification('Ошибка загрузки портов: ' + error.message, true);
            window.UIManager?.setStatus('Ошибка загрузки портов');
        }
    }

    async refreshPorts() {
        if (!window.ipcRenderer) return;

        try {
            window.UIManager?.setStatus('Обновление списка портов...');
            await window.UploadManager.refreshPorts();
           // window.UIManager?.setStatus(window.boardUIManager.getBoardInfo());
        } catch (error) {
            console.error('Error refreshing ports:', error);
            window.UIManager?.showNotification('Ошибка обновления портов: ' + error.message, true);
        }
    }


    clearWorkspace() {
        if (window.WorkspaceManager && this.workspace && window.UIManager) {
            if (window.WorkspaceManager.clearWorkspace(this.workspace)) {
                window.UIManager.clearCodeOutput();
                this.currentProjectPath = null;
                window.CompilationManager.setSketchPath(null);
                window.ProjectStateManager.clearProjectState();
                window.UIManager.showNotification('Рабочая область очищена 🗑️');
            }
        }
    }

    clearRecentProjects() {
        this.recentProjects = [];
        localStorage.setItem('recentProjects', JSON.stringify(this.recentProjects));
        this.updateRecentProjectsMenu();
        window.UIManager.showNotification('Список последних проектов очищен');
    }

    copyCode() {
        const codeOutput = document.getElementById('codeOutput');
        if (!codeOutput) return;

        const code = codeOutput.textContent;

        if (!code || !code.trim()) {
            window.UIManager?.showNotification('Нет кода для копирования!', true);
            return;
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(() => {
                window.UIManager?.showNotification('Код скопирован в буфер обмена! 📋');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(code);
            });
        } else {
            this.fallbackCopyTextToClipboard(code);
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            window.UIManager?.showNotification('Код скопирован в буфер обмена! 📋');
        } catch (err) {
            console.error('Fallback copy failed:', err);
            window.UIManager?.showNotification('Ошибка копирования кода', true);
        }

        document.body.removeChild(textArea);
    }

    addToRecentProjects(filePath) {
        this.recentProjects = this.recentProjects.filter(p => p.path !== filePath);

        this.recentProjects.unshift({
            path: filePath,
            name: filePath.split(/[\\/]/).pop(),
            timestamp: new Date().toISOString()
        });

        if (this.recentProjects.length > 10) {
            this.recentProjects = this.recentProjects.slice(0, 10);
        }

        localStorage.setItem('recentProjects', JSON.stringify(this.recentProjects));
        this.updateRecentProjectsMenu();
    }

    updateRecentProjectsMenu() {
        if (!window.ipcRenderer) return;

        window.ipcRenderer.invoke('update-recent-projects', this.recentProjects).catch(console.error);
    }

    async loadRecentProject(filePath) {
        if (!window.ipcRenderer) return;

        try {
            const result = await window.ipcRenderer.invoke('load-sketch', filePath);
            if (result.success) {
                await this.loadProject(filePath, result.content);
            }
        } catch (error) {
            window.UIManager.showNotification('Ошибка загрузки проекта: ' + error.message, true);
        }
    }



    insertInclude(event, libraryName) {
        if (window.CodeEditor && window.CodeEditor.editor) {
            const includeText = `#include <${libraryName}.h>`;
            const editor = window.CodeEditor.editor;
            editor.value = includeText + '\n' + editor.value;

            if (window.CodeEditor.highlightCode) {
                window.CodeEditor.highlightCode(editor.value);
            }

            window.UIManager.switchToCodeMode();
            window.ProjectStateManager.saveProjectState();
        }
    }

    loadInoExample(event, data) {
        if (window.CodeEditor && window.CodeEditor.setValue) {
            window.CodeEditor.setValue(data.content);
            window.UIManager.showNotification(`Загружен пример: ${data.filename}`);
            window.UIManager.switchToCodeMode();
            window.ProjectStateManager.saveProjectState();
        }
    }

    async checkArduinoCLI() {
        if (!window.ipcRenderer) return false;

        try {
            const result = await window.ipcRenderer.invoke('check-arduino-cli');
            return result.installed;
        } catch (error) {
            console.error('Error checking arduino-cli:', error);
            return false;
        }
    }
}

// Инициализация приложения
// Инициализация приложения
const appController = new AppController();
window.AppController = appController;

// Глобальные функции для HTML
window.generateCode = () => window.AppController.generateCode();
window.compileSketch = () => window.AppController.compileSketch();
//window.uploadSketch = () => window.AppController.uploadSketch();

window.showUploadModal = () => window.AppController.showUploadModal();
window.hideUploadModal = () => window.UploadManager?.hideUploadModal();
window.refreshPorts = () => window.AppController.refreshPorts();
window.uploadSketch = () => window.UploadManager?.startUploadProcess();

window.saveProject = () => window.AppController.saveProject();
window.openProject = () => window.AppController.openProject();
window.exportSketch = () => window.AppController.exportSketch();
window.loadRecentProject = (filePath) => window.AppController.loadRecentProject(filePath);
window.refreshPorts = () => window.AppController.refreshPorts();




window.getProjectState = () => window.ProjectStateManager.getProjectState();

// UI control functions
window.switchTab = (tabName) => {
    if (window.UIManager) {
        window.UIManager.switchTab(tabName);
        if (tabName === 'editor') {
            const codeEditor = document.getElementById('codeEditor');
            if (codeEditor && codeEditor.value) {
                window.ProjectStateManager.saveProjectState();
            }
        }
    }
};

// Добавить глобальную функцию:
window.openCircuitSimulator = function(code = '') {
    // Проверяем, находимся ли мы в Electron
    if (window.ipcRenderer) {
        // Открываем симулятор в отдельном окне через IPC
        window.ipcRenderer.send('open-circuit-simulator', {
            code: code,
            boardType: document.getElementById('boardSelect').value
        });
    } else {
        // Если в браузере - открываем в новой вкладке
        const encodedCode = btoa(encodeURIComponent(code));
        window.open(`simulator/index.html?arduinoCode=${encodedCode}`, '_blank');
    }
};

// Обновить функцию openSimulator в renderer.js:
window.openSimulator = () => {
    const code = window.UIManager?.getCurrentCode() || '';
    window.openCircuitSimulator(code);
};


window.toggleCodePanel = () => {
    window.UIManager?.toggleCodePanel();
    window.ProjectStateManager.saveProjectState();
};

window.toggleOutputPanel = () => {
    window.UIManager?.toggleOutputPanel();
};

window.toggleCodeFullscreen = () => {
    window.UIManager?.toggleCodeFullscreen();
};

window.copyCode = () => {
    window.AppController.copyCode();
};

window.loadCodeFromEditor = () => {
    window.UIManager?.loadCodeFromEditor();
    window.ProjectStateManager.saveProjectState();
};

window.switchToBlocksMode = () => {
    window.UIManager?.switchToBlocksMode();
    window.ProjectStateManager.saveProjectState();
};

window.switchToCodeMode = () => {
    window.UIManager?.switchToCodeMode();
    window.ProjectStateManager.saveProjectState();
};

window.toggleTheme = () => {
    window.ThemeManager?.toggleTheme();
    window.ProjectStateManager.saveProjectState();
};

window.switchOutputTab = (tabName) => {
    window.UIManager?.switchOutputTab(tabName);
};



// Serial monitor functions
window.toggleSerialConnection = () => window.SerialManager?.toggleSerialConnection();
window.clearSerialMonitor = () => window.SerialManager?.clearSerialMonitor();
window.sendSerialData = () => window.SerialManager?.sendSerialData();
window.refreshSerialPorts = () => window.SerialManager?.refreshSerialPorts();

// Example and workspace functions
window.loadExample = (exampleName) => {
    if (window.WorkspaceManager && window.AppController.workspace) {
        window.WorkspaceManager.loadExample(window.AppController.workspace, exampleName);
        window.ProjectStateManager.saveProjectState();
    }
};

window.clearWorkspace = () => window.AppController.clearWorkspace();


// Arduino CLI functions
window.installArduinoCLI = async () => {
    if (!window.UIManager) return;

    try {
        if (window.ipcRenderer && require('electron').shell) {
            require('electron').shell.openExternal('https://arduino.github.io/arduino-cli/latest/installation/');
        }

        window.UIManager.showNotification('Открыта инструкция по установке arduino-cli в браузере');

        setTimeout(() => {
            window.UIManager.updateLogOutput(
                'Инструкция по установке arduino-cli:\n\n' +
                '1. Скачайте arduino-cli с https://arduino.github.io/arduino-cli/latest/installation/\n' +
                '2. Распакуйте в папку с приложением или в системный PATH\n' +
                '3. Перезапустите приложение\n\n' +
                'Альтернатива: установите официальную Arduino IDE с https://www.arduino.cc/en/software'
            );
        }, 1000);

    } catch (error) {
        console.error('Error opening installation guide:', error);
        window.UIManager.showNotification('Ошибка открытия инструкции', true);
    }
};


window.updateCLIButton = async () => {
    const hasCLI = await window.AppController.checkArduinoCLI();
    const installBtn = document.getElementById('installCliBtn');

    if (installBtn) {
        installBtn.style.display = hasCLI ? 'none' : 'flex';
    }
};

// Инициализация при загрузке DOM
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');

    // Проверяем наличие core модулей
    console.log('Checking core modules on DOM loaded:', {
        CodeGenerator: !!window.CodeGenerator,
        BlockParser: !!window.BlockParser,
        HelperGenerator: !!window.HelperGenerator
    });

    // Инициализируем UI и тему
    if (window.ThemeManager && window.ThemeManager.init) {
        window.ThemeManager.init();
    }

    if (window.UIManager && window.UIManager.init) {
        window.UIManager.init();
    }

//    // Проверяем наличие необходимых компонентов симулятора
//    if (typeof SimulatorCore !== 'undefined') {
//        console.log('Simulator modules loaded successfully');
//
//        // Инициализируем глобальный менеджер симулятора
//        if (typeof SimulatorManager !== 'undefined') {
//            window.simulatorManager = new SimulatorManager().init();
//            console.log('SimulatorManager initialized');
//        }
//    } else {
//        console.warn('Simulator modules not loaded');
//    }

    // Инициализируем основное приложение
    setTimeout(() => {
        appController.initialize();
    }, 500);
});



console.log('Renderer process started');


