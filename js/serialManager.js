// serialManager.js - обновленный для вывода данных из Serial.print
class SerialManager {
    static init() {
        this.isConnected = false;
        this.currentPort = null;
        this.currentBaudRate = 9600;
        this.buffer = '';
        this.lastOutputTime = 0;
        this.outputTimeout = null;
        this.isLinux = navigator.platform.toLowerCase().includes('linux');

        this.setupEventListeners();
        this.loadPorts();

        console.log('SerialManager initialized for platform:', this.isLinux ? 'Linux' : navigator.platform);
    }

    static setupEventListeners() {
        if (window.ipcRenderer) {
            this.setupIpcListeners();
        }

        this.setupDomEventListeners();
    }

    static setupIpcListeners() {
        const handlers = {
            'serial-port-connected': (event, data) => this.onSerialConnected(data),
            'serial-data-received': (event, data) => this.onSerialDataReceived(data),
            'serial-port-error': (event, error) => this.onSerialError(error),
            'serial-port-disconnected': () => this.onSerialDisconnected()
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            window.ipcRenderer.on(event, handler);
        });
    }

    static setupDomEventListeners() {
        const serialInput = document.getElementById('serialInput');
        if (serialInput) {
            serialInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendSerialData();
                }
            });
        }
    }

    static async loadPorts() {
        if (!window.ipcRenderer) return;

        try {
            this.showSerialMessage('Поиск COM-портов...', 'info');
            const ports = await window.ipcRenderer.invoke('get-ports');
            this.updatePortSelect(ports);
        } catch (error) {
            console.error('Error loading serial ports:', error);
            this.showSerialMessage(`Ошибка загрузки портов: ${error.message}`, 'error');
        }
    }

    static updatePortSelect(ports) {
        const select = document.getElementById('serialPortSelect');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Выберите порт...</option>';

        if (ports.length === 0) {
            this.addNoPortsOption(select);
        } else {
            ports.forEach(port => this.addPortOption(select, port));
        }

        this.restoreSelectedValue(select, currentValue, ports);
    }

    static addNoPortsOption(select) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Порты не найдены';
        option.disabled = true;
        select.appendChild(option);
    }

    static addPortOption(select, port) {
        const option = document.createElement('option');
        option.value = port.path;

        // Более понятное отображение для Linux портов
        let displayName = port.path;
        if (this.isLinux) {
            // Для Linux убираем длинный путь /dev/ и показываем кратко
            displayName = port.path.replace('/dev/', '');

            // Добавляем информацию о производителе если есть
            if (port.manufacturer && port.manufacturer !== 'Serial Device') {
                displayName += ` (${port.manufacturer})`;
            }

            // Помечаем USB порты
            if (port.path.includes('ttyUSB')) {
                displayName += ' [USB]';
            } else if (port.path.includes('ttyACM')) {
                displayName += ' [ACM]';
            }
        } else if (port.manufacturer) {
            displayName += ` (${port.manufacturer})`;
        }

        option.textContent = displayName;
        option.dataset.fullPath = port.path;
        select.appendChild(option);
    }


    static restoreSelectedValue(select, currentValue, ports) {
        if (currentValue && ports.some(port => port.path === currentValue)) {
            select.value = currentValue;
        }
    }

    static async refreshSerialPorts() {
        await this.loadPorts();
    }

    static async toggleSerialConnection() {
        this.isConnected ? await this.disconnect() : await this.connect();
    }

     static async connect() {
        const portSelect = document.getElementById('serialPortSelect');
        const baudSelect = document.getElementById('serialBaudSelect');

        if (!portSelect || !baudSelect || !window.ipcRenderer) return;

        const port = portSelect.value;
        const baudRate = baudSelect.value;

        if (!port) {
            this.showSerialMessage('Выберите порт для подключения', 'error');
            return;
        }

        // Особое сообщение для Linux
        if (this.isLinux && port.includes('/dev/')) {
            this.showSerialMessage(`Подключение к ${port} на Linux...`, 'info');

            // Проверяем права на порт (для информации)
            try {
                // Это может помочь пользователю понять проблему с правами
                const checkResult = await this.checkLinuxPortPermissions(port);
                if (checkResult.error) {
                    this.showSerialMessage(`⚠️ ${checkResult.message}`, 'warning');
                }
            } catch (e) {
                // Игнорируем ошибки проверки
            }
        }

        try {
            const result = await window.ipcRenderer.invoke('connect-serial-port', {
                port,
                baudRate: parseInt(baudRate)
            });

            if (result.success) {
                this.showSerialMessage(`Подключение устанавливается...`, 'info');
            } else {
                let errorMessage = `Ошибка подключения: ${result.error}`;

                // Дополнительная информация для Linux
                if (this.isLinux) {
                    if (result.error.includes('permission') || result.error.includes('Permission denied')) {
                        errorMessage += '\n\nДля Linux: добавьте себя в группу dialout:\n' +
                                       'sudo usermod -a -G dialout $USER\n' +
                                       'Или настройте права на порт:\n' +
                                       'sudo chmod 666 ' + port + '\n' +
                                       'После этого перезапустите приложение или переподключитесь.';
                    } else if (result.error.includes('device') || result.error.includes('busy')) {
                        errorMessage += '\n\nВозможно порт используется другим приложением.';
                    }
                }

                this.showSerialMessage(errorMessage, 'error');
            }
        } catch (error) {
            let errorMessage = `Ошибка: ${error.message}`;

            // Дополнительная информация для Linux
            if (this.isLinux) {
                errorMessage += '\n\nПроверьте:\n' +
                               '1. Правильность пути к порту (/dev/ttyUSB0, /dev/ttyACM0)\n' +
                               '2. Права доступа к порту\n' +
                               '3. Установлены ли драйверы для вашего контроллера';
            }

            this.showSerialMessage(errorMessage, 'error');
        }
    }

    static async checkLinuxPortPermissions(port) {
        // Функция для проверки прав доступа к порту на Linux
        if (!this.isLinux) return { error: false };

        try {
            // Попытка получить информацию о порте
            const result = await fetch('/check-port', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port })
            }).then(res => res.json());

            return result;
        } catch (error) {
            return { error: true, message: 'Не удалось проверить права доступа' };
        }
    }


    static async disconnect() {
        if (!window.ipcRenderer || !this.isConnected) return;

        try {
            const result = await window.ipcRenderer.invoke('disconnect-serial-port');
            if (result.success) {
                this.showSerialMessage('Отключение...', 'info');
            } else {
                this.showSerialMessage(`Ошибка: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showSerialMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    static onSerialConnected(data) {
        this.isConnected = true;
        this.currentPort = data.port;
        this.currentBaudRate = data.baudRate;
        this.buffer = '';
        this.updateConnectionUI();
        this.showSerialMessage(`✓ Подключено к ${data.port} (${data.baudRate} бод)`, 'info');
    }

    static onSerialDisconnected() {
        this.isConnected = false;
        this.currentPort = null;
        this.buffer = '';
        this.updateConnectionUI();
        this.showSerialMessage('✗ Отключено', 'info');
    }

    static onSerialDataReceived(data) {
        if (!data) return;

        // Добавляем данные в буфер
        this.buffer += data;
        this.lastOutputTime = Date.now();

        // Если есть таймаут - очищаем его
        if (this.outputTimeout) {
            clearTimeout(this.outputTimeout);
        }

        // Устанавливаем новый таймаут для вывода буфера
        this.outputTimeout = setTimeout(() => {
            this.flushBuffer();
        }, 100); // Выводим буфер через 50мс бездействия
    }

    // Вывод буфера в монитор порта
    static flushBuffer() {
        if (this.buffer.trim()) {
            this.showSerialMessage(this.buffer, 'incoming');
            this.buffer = '';
        }
        this.outputTimeout = null;
    }

    static onSerialError(error) {
        this.showSerialMessage(`Ошибка: ${error}`, 'error');
        this.isConnected = false;
        this.buffer = '';
        this.updateConnectionUI();
    }

    static updateConnectionUI() {
        const elements = {
            connectBtn: document.getElementById('serialConnectBtn'),
            disconnectBtn: document.getElementById('serialDisconnectBtn'),
            portSelect: document.getElementById('serialPortSelect'),
            baudSelect: document.getElementById('serialBaudSelect'),
            serialInput: document.getElementById('serialInput'),
            sendBtn: document.querySelector('button[onclick="sendSerialData()"]')
        };

        if (this.isConnected) {
            elements.connectBtn && (elements.connectBtn.style.display = 'none');
            elements.disconnectBtn && (elements.disconnectBtn.style.display = 'flex');
            elements.portSelect && (elements.portSelect.disabled = true);
            elements.baudSelect && (elements.baudSelect.disabled = true);
            elements.serialInput && (elements.serialInput.disabled = false);
            elements.sendBtn && (elements.sendBtn.disabled = false);
        } else {
            elements.connectBtn && (elements.connectBtn.style.display = 'flex');
            elements.disconnectBtn && (elements.disconnectBtn.style.display = 'none');
            elements.portSelect && (elements.portSelect.disabled = false);
            elements.baudSelect && (elements.baudSelect.disabled = false);
            elements.serialInput && (elements.serialInput.disabled = true);
            elements.sendBtn && (elements.sendBtn.disabled = true);
        }
    }

    static async sendSerialData() {
        const input = document.getElementById('serialInput');
        if (!input || !input.value.trim() || !this.isConnected || !window.ipcRenderer) return;

        const data = input.value.trim();

        try {
            const result = await window.ipcRenderer.invoke('send-serial-data', data);
            if (result.success) {
                this.showSerialMessage(data, 'outgoing');
                input.value = '';
            } else {
                this.showSerialMessage(`Ошибка: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showSerialMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    static showSerialMessage(message, type = 'info') {
        const output = document.getElementById('serialOutput');
        if (!output) return;

        const timestamp = new Date().toLocaleTimeString();
        const messageElement = document.createElement('div');
        messageElement.className = `serial-message ${type}`;
        messageElement.style.cssText = `
            margin: 1px 0;
            padding: 0;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            line-height: 1.2;
            white-space: pre-wrap;
            word-break: break-all;
        `;

        // Сохраняем переносы строк для многострочных сообщений
     //   message = message.replace(/\n/g, '<br>');
        messageElement.innerHTML = `
            <span class="serial-timestamp" style="color: #666; font-size: 9px;">[${timestamp}]</span>
            <span class="serial-content">${this.escapeHtml(message)}</span>
        `;

        output.appendChild(messageElement);
        output.scrollTop = output.scrollHeight;
    }

    static clearSerialMonitor() {
        const output = document.getElementById('serialOutput');
        if (output) {
            output.innerHTML = '';
            this.showSerialMessage('Монитор очищен', 'info');
        }
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static switchToSerialTab() {
        this.loadPorts();
        this.updateConnectionUI();
    }
}

window.SerialManager = SerialManager;