class ProjectStateManager {
    constructor() {
        this.autoSaveEnabled = true;
        this.autoSaveInterval = null;
        this.projectState = {
            blocks: null,
            code: '',
            mode: 'blocks',
            board: 'zero',
            timestamp: null
        };
        this.projectRestored = false;
        this.projectLoaded = false;
        this.isRestoring = false;
    }

    async init() {
        await this.loadAutoSave();
        this.setupAutoSave();

        if (!this.projectRestored) {
            this.scheduleExampleLoad();
        }
    }

    async loadAutoSave() {
        try {
            console.log('Loading auto-save...');

            if (window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('load-auto-save');
                if (result.success && result.data) {
                    console.log('Found auto-save data from main process');
                    await this.restoreProjectState(result.data);
                    this.projectRestored = true;
                    return;
                }
            }

            const savedState = localStorage.getItem('projectState');
            if (savedState) {
                const state = JSON.parse(savedState);
                console.log('Found auto-save data from localStorage');
                await this.restoreProjectState(state);
                this.projectRestored = true;
            } else {
                console.log('No auto-save data found');
            }
        } catch (error) {
            console.warn('Auto-save load failed:', error);
        }
    }

    async restoreProjectState(state) {
        if (this.isRestoring) return;
        this.isRestoring = true;

        try {
            console.log('Restoring project state...');

            if (!state) {
                console.log('No state to restore');
                return;
            }

            // Восстанавливаем плату
            if (state.board && document.getElementById('boardSelect')) {
                document.getElementById('boardSelect').value = state.board;
            }

            // Восстанавливаем режим
            const currentMode = document.body.classList.contains('code-mode') ? 'code' : 'blocks';
            if (state.mode && state.mode !== currentMode) {
                if (state.mode === 'code') {
                    window.switchToCodeMode?.();
                } else {
                    window.switchToBlocksMode?.();
                }

                setTimeout(() => {
                        window.switchToCodeMode?.();
                        // Дополнительное обновление размеров
                        setTimeout(() => window.UIManager?.resizeBlockly(), 500);
                    }, 100);
            }

            // Ждем готовности workspace
            let attempts = 0;
            while (!window.AppController?.workspaceReady && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            // Восстанавливаем блоки
            if (state.blocks && window.workspace) {
                console.log('Restoring blocks...');
                try {
                    // Очищаем workspace
                    window.workspace.clear();
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Создаем глубокую копию без циклических ссылок
                    const blocksData = this.safeClone(state.blocks);

                    // Загружаем блоки
                    Blockly.serialization.workspaces.load(blocksData, window.workspace);

                    console.log('Blocks restored successfully');

                    // Даем время на инициализацию всех блоков
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Обновляем все вызовы функций (только один раз!)
                    if (window.updateAllFunctionCalls) {
                        setTimeout(() => {
                            window.updateAllFunctionCalls();
                        }, 1500);
                    }

                    // Если мы в режиме блоков, генерируем код
                    if (state.mode === 'blocks') {
                        setTimeout(() => {
                            if (window.generateCode) window.generateCode();
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error restoring blocks:', error);
                }
            }

            // Восстанавливаем код
            if (state.code && window.UIManager) {
                console.log('Restoring code...');
                await new Promise(resolve => setTimeout(resolve, 500));
                window.UIManager.updateCodeOutput(state.code);
                console.log('Code restored successfully');
            }

            this.projectRestored = true;
            this.projectLoaded = true;
            console.log('Project state fully restored from auto-save');

            // Обновляем состояние проекта
            setTimeout(() => this.saveProjectState(), 1000);

        } catch (error) {
            console.error('Error restoring project state:', error);
        } finally {
            this.isRestoring = false;
        }
    }

    // Безопасное клонирование без циклических ссылок
    safeClone(obj) {
        const seen = new WeakSet();
        return JSON.parse(JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return undefined;
                }
                seen.add(value);
            }
            return value;
        }));
    }

//    // Обновляем все вызовы функций после загрузки
//    updateAllFunctionCalls() {
//        const workspace = Blockly.getMainWorkspace();
//        if (!workspace) return;
//
//        const allBlocks = workspace.getAllBlocks(false);
//
//        // Сначала обновляем все списки функций
//        allBlocks.forEach(block => {
//            if (block.type === 'function_call' || block.type === 'function_call_no_return') {
//                if (typeof block.updateFunctionList === 'function') {
//                    block.updateFunctionList();
//                }
//            }
//        });
//
//        // Затем устанавливаем значения и обновляем аргументы
//        allBlocks.forEach(block => {
//            if (block.type === 'function_call' || block.type === 'function_call_no_return') {
//                const dropdown = block.getField('NAME');
//                if (dropdown) {
//                    // Пробуем получить имя функции из сохраненного состояния или из поля
//                    const funcName = block.savedFunctionName_ || block.getFieldValue('NAME');
//                    if (funcName && funcName.trim() !== '') {
//                        // Проверяем, есть ли такая опция в dropdown
//                        const options = dropdown.getOptions();
//                        const exists = options.some(opt => opt[1] === funcName);
//                        if (exists) {
//                            dropdown.setValue(funcName);
//                            if (typeof block.updateFunctionArgs === 'function') {
//                                block.updateFunctionArgs(funcName);
//                            }
//                        }
//                    }
//                }
//            }
//        });
//    }

    scheduleExampleLoad() {
        setTimeout(() => {
            if (!this.projectLoaded && window.loadExample) {
                console.log('Loading example project...');
                window.loadExample('blink');
                this.projectLoaded = true;
            }
        }, 1000);
    }

    setupAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveProjectState();
        }, 30000);

        window.addEventListener('beforeunload', () => {
            this.saveProjectState();
        });
    }

    async saveProjectState() {
        if (!this.autoSaveEnabled || this.isRestoring) return;

        try {
            if (!window.workspace) {
                console.log('Workspace not ready, skipping auto-save');
                return;
            }

            // Сохраняем workspace
            const blocks = Blockly.serialization.workspaces.save(window.workspace);
            
            // Используем безопасное клонирование
            const simpleBlocks = this.safeClone(blocks);

            this.projectState = {
                blocks: simpleBlocks,
                code: this.getCurrentCode(),
                mode: document.body.classList.contains('code-mode') ? 'code' : 'blocks',
                board: document.getElementById('boardSelect')?.value || 'zero',
                timestamp: new Date().toISOString()
            };

            console.log('Saving project state');

            localStorage.setItem('projectState', JSON.stringify(this.projectState));

            if (window.ipcRenderer) {
                await window.ipcRenderer.invoke('auto-save-project', this.projectState);
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    getCurrentCode() {
        const editorTab = document.getElementById('editorTab');
        const codeEditor = document.getElementById('codeEditor');

        if (editorTab?.classList.contains('active') && codeEditor) {
            return codeEditor.value;
        } else {
            const codeOutput = document.getElementById('codeOutput');
            return codeOutput ? codeOutput.textContent : '';
        }
    }

    getProjectState() {
        return this.projectState;
    }

    clearProjectState() {
        this.projectState = {
            blocks: null,
            code: '',
            mode: 'blocks',
            board: 'zero',
            timestamp: null
        };
        localStorage.removeItem('projectState');
        this.projectRestored = false;
        this.projectLoaded = false;
    }

    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    wasProjectRestored() {
        return this.projectRestored;
    }
}

window.ProjectStateManager = ProjectStateManager;

