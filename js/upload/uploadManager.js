// UploadManager.js - Исправленная версия
class UploadManager {
    static init() {
        this.isUploading = false;
        this.isCompiling = false;
        this.currentProgress = 0;
        this.uploadLog = [];
        this.currentPort = null;
        this.selectedPort = null;
        this.currentBoard = null;
        this.currentSketchPath = null;
        this.uploadStage = 'idle';
        this.wasSerialConnected = false;
        this.previousSerialPort = null;
        this.previousSerialBaudRate = null;
        this.lastCompiledCode = null;
        this.isModalVisible = false;

        this.setupEventListeners();
        this.createProgressUI();

        console.log('UploadManager initialized');
    }

    static setupEventListeners() {
        if (window.ipcRenderer) {
            window.ipcRenderer.on('upload-progress', (event, data) => {
                this.handleUploadProgress(data);
            });
        }
    }

    static createProgressUI() {
        const uploadModal = document.getElementById('uploadModal');
        if (!uploadModal) return;

        const oldContainer = document.getElementById('uploadProgressContainer');
        if (oldContainer) oldContainer.remove();

        const portList = document.getElementById('portList');
        if (!portList) return;

        const progressHTML = `
            <div id="uploadProgressContainer" style="display: none;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
                    <div id="uploadProgressPercent" style="font-weight: bold; color: var(--primary-color); min-width: 40px;">0%</div>
                    <div id="uploadProgressStatus" style="font-size: 11px; color: #666; flex-grow: 1; text-align: center;">Готов</div>
                </div>
                <div style="height: 6px; background: var(--background-dark); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                    <div id="uploadProgressBar" style="width: 0%; height: 100%; background: var(--primary-color); transition: width 0.2s ease-in-out;"></div>
                </div>
                <div id="uploadProgressMessage" style="height: 120px; overflow-y: auto; font-size: 10px; font-family: 'Consolas', 'Monaco', monospace; padding: 4px; border-radius: 3px; border: 1px solid #333;">
                    <!-- Лог загрузки будет здесь -->
                </div>
            </div>
        `;

        portList.insertAdjacentHTML('afterend', progressHTML);
    }

    static async showUploadModal(ports = null) {
        this.resetProgress();
        this.hideProgressContainer();
        this.selectedPort = null;

        const portList = document.getElementById('portList');
        if (!portList) {
            console.error('portList element not found!');
            return;
        }

        // Если порты не переданы, запрашиваем их
        if (!ports) {
            try {
                ports = await window.ipcRenderer.invoke('get-ports');
            } catch (error) {
                console.error('Error loading ports:', error);
                this.showNoPortsMessage(portList);
                return;
            }
        }

        // Очищаем и заполняем список портов
        this.updatePortList(ports);

        // Показываем модальное окно
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.style.display = 'block';
            this.isModalVisible = true;

            // Обработчик клика вне модального окна
            uploadModal.onclick = (e) => {
                if (e.target === uploadModal) {
                    this.hideUploadModal();
                }
            };
        }

        this.updateUploadButton();
    }

    static updatePortList(ports) {
        const portList = document.getElementById('portList');
        if (!portList) return;

        portList.innerHTML = '';

        if (!ports?.length) {
            this.showNoPortsMessage(portList);
        } else {
            ports.forEach(port => {
                const portItem = this.createPortItem(port);
                portList.appendChild(portItem);
            });
        }
    }

    static hideUploadModal() {
        // Проверяем, идет ли загрузка
        if (this.isUploading) {
            const confirmClose = confirm('Идет загрузка. Вы уверены, что хотите отменить?');
            if (!confirmClose) return;

            // Отменяем загрузку
            this.cancelUpload();
        }

        // Скрываем прогресс
        this.hideProgressContainer();
        this.resetProgress();

        // Скрываем модальное окно
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.style.display = 'none';
            this.isModalVisible = false;
        }

        this.selectedPort = null;
    }

    static showNoPortsMessage(portList) {
        if (!portList) return;

        portList.innerHTML = `
            <div class="port-item no-ports">
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔌</div>
                    <strong>COM-порты не найдены</strong>
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">
                        Подключите Arduino и нажмите "Обновить"
                    </div>
                </div>
            </div>
        `;
    }

    static createPortItem(port) {
        const portItem = document.createElement('div');
        portItem.className = 'port-item';
        portItem.innerHTML = `
            <div class="port-info">
                <div class="port-name">
                    <strong>${port.displayName || port.path}</strong>
                </div>
                <div class="port-details">
                    <small>Производитель: ${port.manufacturer || 'Неизвестно'}</small>
                    ${port.vendorId ? `<br><small>VID: ${port.vendorId}, PID: ${port.productId || 'N/A'}</small>` : ''}
                </div>
            </div>
        `;

        portItem.onclick = () => this.selectPort(portItem, port.path);
        return portItem;
    }

    static selectPort(portItem, portPath) {
        document.querySelectorAll('.port-item').forEach(item => {
            item.classList.remove('selected');
        });

        portItem.classList.add('selected');
        this.selectedPort = portPath;
        this.updateUploadButton();
    }

    static updateUploadButton() {
        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton) {
            const hasSelection = !!this.selectedPort;
            uploadButton.disabled = !hasSelection;
            uploadButton.innerHTML = hasSelection ?
                '<span class="icon btn-upload"></span> Загрузить' :
                '<span class="icon btn-settings"></span> Выберите порт';
        }
    }

    static async refreshPorts() {
        try {
            const ports = await window.ipcRenderer.invoke('get-ports');
            this.showUploadModal(ports);
        } catch (error) {
            console.error('Error refreshing ports:', error);
            window.UIManager?.showNotification('Ошибка обновления портов: ' + error.message, true);
        }
    }

    static async startUploadProcess() {
        console.log('Starting upload process...');

        if (this.isUploading) {
            window.UIManager?.showNotification('Загрузка уже выполняется', true);
            return false;
        }

        // Проверяем, выбран ли порт
        if (!this.selectedPort) {
            window.UIManager?.showNotification('Выберите COM порт', true);
            return false;
        }

        try {
            // Инициализация
            this.isUploading = true;
            this.currentPort = this.selectedPort;
            this.currentBoard = window.UIManager?.getSelectedBoard();
            this.uploadStage = 'preparing';

            // Показываем UI
            this.showProgressContainer();
            this.blockUI(true);
            this.addLogMessage('Запуск процесса загрузки...', 'start');
            this.updateProgressBar(5, 'Инициализация');

            // Шаг 1: Компиляция
            if (!await this.compileSketch()) {
                await this.completeUpload(false);
                return false;
            }

            // Шаг 2: Отключение монитора порта
            await this.disconnectSerialMonitor();

            // Шаг 3: Загрузка
            if (!await this.executeUpload()) {
                await this.completeUpload(false);
                return false;
            }

            // Успешное завершение
            await this.completeUpload(true);
            return true;

        } catch (error) {
            console.error('Upload process error:', error);
            this.addLogMessage(`Ошибка: ${error.message}`, 'error');
            await this.completeUpload(false);
            return false;
        }
    }

    static async compileSketch() {
        this.isCompiling = true;
        const code = window.UIManager?.getCurrentCode();

        if (!code || !code.trim() || code.includes('// Сгенерированный код появится здесь...')) {
            this.addLogMessage('Нет кода для компиляции', 'error');
            this.isCompiling = false;
            return false;
        }

        const codeHash = this.hashCode(code);
        const isCodeChanged = codeHash !== this.lastCompiledCode;
        this.lastCompiledCode = codeHash;

        this.addLogMessage('Компиляция скетча...', 'info');
        this.updateProgressBar(10, 'Компиляция');

        if (isCodeChanged) {
            this.addLogMessage('Код изменен, требуется компиляция', 'info');
        }

        try {
            const board = window.UIManager?.getSelectedBoard();
            this.addLogMessage(`Плата: ${board}`, 'info');
            const result = await window.ipcRenderer.invoke('compile-sketch', { code, board });

            if (result.success) {
                this.currentSketchPath = result.sketchPath;
                this.addLogMessage('Компиляция успешна', 'success');
                this.updateProgressBar(25, 'Компиляция завершена');
                this.isCompiling = false;
                return true;
            } else {
                this.addLogMessage(`Ошибка компиляции: ${result.error}`, 'error');
                this.isCompiling = false;
                return false;
            }
        } catch (error) {
            this.addLogMessage(`Ошибка компиляции: ${error.message}`, 'error');
            this.isCompiling = false;
            return false;
        }
    }

    static hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    static async disconnectSerialMonitor() {
        if (window.SerialManager?.isConnected) {
            this.uploadStage = 'disconnecting';
            this.addLogMessage('Отключаю монитор порта...', 'info');

            this.wasSerialConnected = true;
            this.previousSerialPort = window.SerialManager.currentPort;
            this.previousSerialBaudRate = window.SerialManager.currentBaudRate;

            try {
                await window.SerialManager.disconnect();
                await new Promise(resolve => setTimeout(resolve, 500));
                this.addLogMessage('Монитор порта отключен', 'success');
                return true;
            } catch (error) {
                this.addLogMessage(`Не удалось отключить монитор порта: ${error.message}`, 'warning');
                return false;
            }
        }
        return true;
    }

    // В методе executeUpload исправляем получение настроек:
    // В UploadManager.js заменяем метод executeUpload:
    static async executeUpload() {
        try {
            this.uploadStage = 'uploading';
            this.addLogMessage(`Загрузка на порт: ${this.currentPort}`, 'info');
            this.updateProgressBar(30, 'Подготовка загрузчика');

            // Получаем настройки через BoardConfigManager
            let uploadSettings = {};

            if (window.boardConfigManager && typeof window.boardConfigManager.getUploadSettings === 'function') {
                const boardSelect = document.getElementById('boardSelect');
                const boardId = boardSelect?.value || this.currentBoard;

                uploadSettings = window.boardConfigManager.getUploadSettings(boardId);
                console.log('Upload settings from config manager:', uploadSettings);
            } else {
                // Fallback
                uploadSettings = {
                    speed: '115200',
                    protocol: 'serial'
                };
            }

            const result = await window.ipcRenderer.invoke('upload-sketch', {
                sketchPath: this.currentSketchPath,
                board: this.currentBoard,
                port: this.currentPort,
                uploadSettings: uploadSettings
            });

            if (result.success) {
                this.updateProgressBar(100, 'Загрузка завершена');
                this.addLogMessage('Загрузка выполнена успешно!', 'success');
                return true;
            } else {
                this.addLogMessage(`Ошибка загрузки: ${result.error}`, 'error');
                window.UIManager?.setStatus('Ошибка загрузки :(');
                return false;
            }
        } catch (error) {
            this.addLogMessage(`Исключение при загрузке: ${error.message}`, 'error');
            window.UIManager?.setStatus('Исключение при загрузке :(');

            return false;
        }
    }

    static async completeUpload(success = true) {
        this.isUploading = false;
        this.uploadStage = success ? 'completed' : 'error';

        if (success) {
            this.updateProgressBar(100, 'Загрузка завершена');
            this.addLogMessage('Процесс загрузки завершен', 'success');
            window.UIManager?.showNotification('Загрузка выполнена успешно!');
            window.UIManager?.setStatus('Загрузка выполнена успешно :)');
            // Восстанавливаем подключение к serial порту, если оно было
            setTimeout(() => {
                this.restoreSerialConnection();
            }, 1000);
        } else {
            this.updateProgressBar(100, 'Ошибка');
            this.addLogMessage('Загрузка прервана', 'error');
        }

        setTimeout(() => {
            this.cleanupAfterUpload();
        }, 2000);
    }

    static async restoreSerialConnection() {
        if (this.wasSerialConnected && this.previousSerialPort && this.previousSerialBaudRate) {
            try {
                this.addLogMessage('Восстанавливаю подключение к монитору порта...', 'info');
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (window.SerialManager) {
                    await window.SerialManager.connect(this.previousSerialPort, this.previousSerialBaudRate);
                    this.addLogMessage('Монитор порта восстановлен', 'success');
                }
            } catch (error) {
                console.warn('Failed to restore serial connection:', error);
            }
        }
    }

    static cleanupAfterUpload() {
        this.blockUI(false);
        this.hideProgressContainer();
        this.resetProgress();
        this.hideUploadModal();
    }

    static cancelUpload() {
        this.isUploading = false;
        this.addLogMessage('Загрузка отменена пользователем', 'warning');
        this.completeUpload(false);

        // Отправляем запрос на отмену загрузки в main процесс
        if (window.ipcRenderer) {
            window.ipcRenderer.invoke('cancel-upload').catch(console.error);
        }
    }

    static blockUI(block) {
        const selectors = [
            '#uploadButton',
            '.port-item:not(.refresh-item)',
            '.refresh-item button',
            '.modal-actions .btn-secondary',
            '#boardSelect',
            '.btn-compile',
            '.btn-upload',
            '#serialConnectBtn',
            '#serialDisconnectBtn'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.disabled = block;
                    element.style.opacity = block ? '0.6' : '1';
                    element.style.pointerEvents = block ? 'none' : 'auto';
                    element.style.cursor = block ? 'not-allowed' : 'pointer';
                }
            });
        });

        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton) {
            uploadButton.innerHTML = block ?
                '<span class="icon btn-loading"></span> Загрузка...' :
                '<span class="icon btn-upload"></span> Загрузить';
        }
    }

    static addLogMessage(message, type = 'info') {
        const messageContainer = document.getElementById('uploadProgressMessage');
        if (!messageContainer) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `upload-log-entry`;

        logEntry.style.cssText = `
            margin: 0;
            padding: 0;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 10px;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        let color = '#B0BEC5';
        if (type === 'error') color = '#F44336';
        else if (type === 'success') color = '#4CAF50';
        else if (type === 'warning') color = '#FF9800';
        else if (type === 'start') color = '#2196F3';

        logEntry.innerHTML = `
            <span style="color: #666; font-size: 9px; margin-right: 4px;">[${timestamp}]</span>
            <span style="color: ${color};">${this.escapeHtml(message)}</span>
        `;

        messageContainer.appendChild(logEntry);

        setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 10);

        this.uploadLog.push({ timestamp: new Date(), message, type });
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static updateProgressBar(percentage, status = '') {
        const progressBar = document.getElementById('uploadProgressBar');
        const percentText = document.getElementById('uploadProgressPercent');
        const statusText = document.getElementById('uploadProgressStatus');

        if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        if (percentText) {
            percentText.textContent = `${Math.round(percentage)}%`;
            percentText.style.color = percentage === 100 ? '#4CAF50' : 'var(--primary-color)';
        }
        if (statusText) statusText.textContent = status;

        this.currentProgress = percentage;
    }

    static showProgressContainer() {
        const container = document.getElementById('uploadProgressContainer');
        if (container) container.style.display = 'block';
    }

    static hideProgressContainer() {
        const container = document.getElementById('uploadProgressContainer');
        if (container) container.style.display = 'none';
    }

    static resetProgress() {
        this.currentProgress = 0;
        this.updateProgressBar(0, 'Готов');

        const messageContainer = document.getElementById('uploadProgressMessage');
        if (messageContainer) messageContainer.innerHTML = '';

        this.uploadLog = [];
    }

    static handleUploadProgress(data) {
        console.log('Received upload progress event:', data);

        if (!this.isUploading) {
            console.log('Upload not in progress, ignoring event');
            return;
        }

        switch(data.stage) {
            case 'start':
                this.addLogMessage(data.message || '🚀 Начало загрузки...', 'start');
                this.updateProgressBar(data.percentage || 5, 'Начало');
                break;

            case 'uploading':
                if (data.message) {
                    const message = data.message.trim();
                    if (!message) return;

                    if (this.isDuplicateMessage(message)) {
                        return;
                    }

                    let logType = 'uploading';
                    if (message.includes('error') || message.includes('failed') || message.includes('Error')) {
                        logType = 'error';
                    } else if (message.includes('successful') || message.includes('done') ||
                              message.includes('verified') || message.includes('Wrote')) {
                        logType = 'success';
                    } else if (message.includes('Writing') || message.includes('Uploading') ||
                              message.includes('Leaving') || message.includes('Hash') ||
                              message.includes('Chip') || message.includes('Configuring')) {
                        logType = 'uploading';
                    }

                    this.addLogMessage(message, logType);

                    const percentageMatch = message.match(/\((\d+)\s*%\)/);
                    if (percentageMatch) {
                        const percentage = parseInt(percentageMatch[1]);
                        const uploadProgress = 30 + (percentage * 0.65);
                        this.updateProgressBar(uploadProgress, `Загрузка ${percentage}%`);
                    } else if (data.percentage) {
                        this.updateProgressBar(data.percentage, data.message || 'Загрузка...');
                    }
                }
                break;

            case 'verifying':
                this.addLogMessage(data.message || '🔍 Проверка...', 'info');
                this.updateProgressBar(80, 'Проверка данных');
                break;

            case 'complete':
                this.addLogMessage(data.message || '✅ Загрузка завершена!', 'success');
                this.updateProgressBar(data.percentage || 100, 'Завершено');
                break;

            case 'error':
                this.addLogMessage(`❌ ${data.message || 'Ошибка загрузки'}`, 'error');
                if (data.details) {
                    this.addLogMessage(data.details.substring(0, 200), 'error');
                }
                this.updateProgressBar(data.percentage || 100, 'Ошибка');
                break;

            default:
                if (data.message) {
                    this.addLogMessage(data.message, 'info');
                }
                if (data.percentage) {
                    this.updateProgressBar(data.percentage, data.message || '');
                }
                break;
        }
    }

    static isDuplicateMessage(message) {
        if (!this.uploadLog || this.uploadLog.length === 0) return false;

        const recentMessages = this.uploadLog.slice(-5);
        return recentMessages.some(log => {
            const logMessage = log.message;
            return logMessage === message ||
                   (logMessage && message && logMessage.includes(message.substring(0, 30)));
        });
    }

    static getSelectedPort() {
        return this.selectedPort;
    }
}

// Инициализация при загрузке страницы
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof UploadManager !== 'undefined') {
                UploadManager.init();
                window.UploadManager = UploadManager;
                console.log('UploadManager initialized on DOM ready');
            }
        }, 500);
    });
}