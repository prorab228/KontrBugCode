class CompilationManager {
    constructor() {
        this.currentSketchPath = null;
    }

    async compileSketch() {
        if (!window.UIManager || !window.ipcRenderer) return;

        const code = window.UIManager.getCurrentCode();

        if (!this.isValidCode(code)) {
            window.UIManager.showNotification('Сначала создайте или введите код!', true);
            return;
        }

        try {
            window.UIManager.setStatus('Компиляция...');
            window.UIManager.updateLogOutput('Начинаем компиляцию...\n');

            const board = window.UIManager.getSelectedBoard();
            const result = await window.ipcRenderer.invoke('compile-sketch', { code, board });

            if (result.success) {
                this.handleCompilationSuccess(result);
            } else {
                if (result.error.includes('CH340') || result.error.includes('driver')) {
                    this.suggestDriverInstallation();
                }
                this.handleCompilationFailure(result);
            }
        } catch (error) {
            this.handleCompilationError(error);
        } finally {
            window.UIManager.setStatus('Готов к работе');
        }
    }



    handleCompilationSuccess(result) {
        window.UIManager.updateLogOutput(
            '✅ Компиляция успешна!\n\n' +
            'Вывод компилятора:\n' +
            (result.stdout || 'Нет вывода') + '\n' +
            (result.stderr || '') + '\n\n' +
            'Скетч скомпилирован и готов к загрузке.'
        );
        window.UIManager.showNotification('Компиляция завершена успешно!');
        this.currentSketchPath = result.sketchPath;
    }

    handleCompilationFailure(result) {
        let errorMessage = '❌ Ошибка компиляции:\n';

        if (result.error.includes('не установлен')) {
            errorMessage += this.getCliInstallationInstructions(result.error);
        } else if (result.error.includes('основной файл')) {
            errorMessage += this.getFileCreationError(result.error);
        } else {
            errorMessage += result.error + '\n';
        }

        if (result.stderr) {
            errorMessage += '\nДетали ошибки:\n' + result.stderr;
        }

        window.UIManager.updateLogOutput(errorMessage);
        window.UIManager.showNotification('Ошибка компиляции!', true);
    }

    handleCompilationError(error) {
        window.UIManager.updateLogOutput(
            '❌ Неожиданная ошибка компиляции:\n' +
            error.message + '\n\n' +
            'Попробуйте перезапустить приложение.'
        );
        window.UIManager.showNotification('Ошибка компиляции: ' + error.message, true);
    }

    handleUploadResult(result) {
        if (result.success) {
            window.UIManager.updateLogOutput(result.stdout + '\n' + result.stderr + '\n\n✅ Загрузка успешна!');
            window.UIManager.showNotification('Скетч загружен на Arduino!');
            window.UIManager.hideUploadModal();
        } else {
            window.UIManager.updateLogOutput('Ошибка загрузки:\n' + result.error + '\n' + result.stderr);
            window.UIManager.showNotification('Ошибка загрузки!', true);
        }
    }

    handleUploadError(error) {
        window.UIManager.showNotification('Ошибка загрузки: ' + error.message, true);
    }

    suggestDriverInstallation() {
        if (window.UIManager && window.ipcRenderer) {
            const install = confirm(
                'Возможно, требуются драйверы CH340 для работы с Arduino.\n\n' +
                'Хотите установить драйверы автоматически?'
            );

            if (install) {
                window.ipcRenderer.invoke('install-ch340-driver').then(result => {
                    if (result.success) {
                        window.UIManager.showNotification('Драйверы CH340 установлены!');
                    } else {
                        window.UIManager.showNotification('Ошибка установки драйверов: ' + result.message, true);
                    }
                });
            }
        }
    }

    getCliInstallationInstructions(error) {
        return error + '\n\nДля решения проблемы:\n' +
            '1. Скачайте arduino-cli с https://arduino.github.io/arduino-cli/latest/installation/\n' +
            '2. Распакуйте в папку с приложением\n' +
            '3. Перезапустите приложение\n';
    }

    getFileCreationError(error) {
        return 'Проблема с созданием файла скетча:\n' + error + '\n\nПопробуйте перезапустить приложение.';
    }

    async compileIfNeeded() {
        const code = window.UIManager.getCurrentCode();
        if (!this.isValidCode(code)) {
            window.UIManager.showNotification('Нет кода для загрузки!', true);
            return false;
        }

        if (confirm('Скетч не скомпилирован. Скомпилировать перед загрузкой?')) {
            await this.compileSketch();
            return !!this.currentSketchPath;
        }
        return false;
    }

    isValidCode(code) {
        return code && code.trim().length > 0 && !code.includes('// Сгенерированный код появится здесь...');
    }

    setSketchPath(path) {
        this.currentSketchPath = path;
    }

    getSketchPath() {
        return this.currentSketchPath;
    }
}

window.CompilationManager = CompilationManager;