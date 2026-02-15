class LogManager {
    static init() {
        this.logs = [];
        this.maxLogEntries = 1000;
        this.isLogWindowVisible = false;
        this.currentLogLevel = localStorage.getItem('logLevel') || 'INFO';
        this.logFilePath = null;
        this.isSaving = false; // Флаг для предотвращения рекурсии
        this.pendingLogs = []; // Очередь логов на сохранение
        this.saveTimeout = null; // Таймер для отложенного сохранения
        
        this.initLogWindow();
        this.setupEventListeners();
        this.setupConsoleOverrides();
        this.loadLogsFromFile();
        
        // Используем другой способ логирования, чтобы избежать рекурсии
        this.addLogEntry('INFO', 'LogManager', 'Система логирования инициализирована');
    }

    static initLogWindow() {
        // Создаем окно логов, если его нет
        if (!document.getElementById('logWindow')) {
            const logWindow = document.createElement('div');
            logWindow.id = 'logWindow';
            logWindow.className = 'log-window';
            logWindow.innerHTML = `
                <div class="log-window-header">
                    <h3>Логи системы</h3>
                    <div class="log-window-controls">
                        <select id="logLevelFilter" class="log-filter">
                            <option value="ALL">Все</option>
                            <option value="DEBUG">Отладка</option>
                            <option value="INFO">Информация</option>
                            <option value="WARN">Предупреждения</option>
                            <option value="ERROR">Ошибки</option>
                            <option value="CRITICAL">Критические</option>
                        </select>
                        <button class="btn-icon" onclick="LogManager.clearLogs()" title="Очистить логи">
                            <span class="icon btn-clear"></span>
                        </button>
                        <button class="btn-icon" onclick="LogManager.saveLogsToFile()" title="Сохранить в файл">
                            <span class="icon btn-save"></span>
                        </button>
                        <button class="btn-icon" onclick="LogManager.toggleLogWindow()" title="Скрыть">
                            <span class="icon btn-close"></span>
                        </button>
                    </div>
                </div>
                <div class="log-window-content">
                    <div id="logEntries" class="log-entries"></div>
                </div>
                <div class="log-window-footer">
                    <input type="text" id="logSearch" placeholder="Поиск в логах..." class="log-search">
                    <button class="btn-icon" onclick="LogManager.exportLogs()" title="Экспорт">
                        <span class="icon bth-export"></span>
                    </button>
                    <button class="btn-icon" onclick="LogManager.toggleAutoScroll()" title="Автопрокрутка">
                        <span class="icon bth-autoscroll"></span>
                    </button>
                </div>
            `;
            document.body.appendChild(logWindow);
        }

        // Устанавливаем начальный уровень фильтрации
        document.getElementById('logLevelFilter').value = this.currentLogLevel;
    }

    static setupEventListeners() {
        // Обработчик фильтрации по уровню
        document.getElementById('logLevelFilter')?.addEventListener('change', (e) => {
            this.currentLogLevel = e.target.value;
            localStorage.setItem('logLevel', this.currentLogLevel);
            this.filterLogs();
        });

        // Обработчик поиска
        document.getElementById('logSearch')?.addEventListener('input', (e) => {
            this.searchLogs(e.target.value);
        });

        // Глобальный обработчик клавиш для открытия логов
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.toggleLogWindow();
            }
        });

        // IPC обработчики для логирования из основного процесса
        if (window.ipcRenderer) {
            window.ipcRenderer.on('log-message', (event, data) => {
                this.addLogEntry(data.level, data.source, data.message);
            });
        }
    }

    static setupConsoleOverrides() {
        // Сохраняем оригинальные методы
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        };

        // Переопределяем console.log
        console.log = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            this.addLogEntry('INFO', 'Console', message);
            originalConsole.log.apply(console, args);
        };

        // Переопределяем console.error
        console.error = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            this.addLogEntry('ERROR', 'Console', message);
            originalConsole.error.apply(console, args);
        };

        // Переопределяем console.warn
        console.warn = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            this.addLogEntry('WARN', 'Console', message);
            originalConsole.warn.apply(console, args);
        };

        // Переопределяем console.info
        console.info = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            this.addLogEntry('INFO', 'Console', message);
            originalConsole.info.apply(console, args);
        };

        // Переопределяем console.debug
        console.debug = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            this.addLogEntry('DEBUG', 'Console', message);
            originalConsole.debug.apply(console, args);
        };
    }

    static log(level, source, message) {
        const timestamp = new Date().toLocaleTimeString('ru-RU');
        const fullTimestamp = new Date().toISOString();
        const logEntry = {
            timestamp: fullTimestamp,
            level,
            source,
            message,
            displayTime: timestamp
        };

        // Добавляем в массив логов
        this.logs.unshift(logEntry);
        
        // Ограничиваем количество записей
        if (this.logs.length > this.maxLogEntries) {
            this.logs.pop();
        }

        // Обновляем отображение, если окно видимо
        if (this.isLogWindowVisible) {
            this.addLogEntryToUI(level, source, message, timestamp);
        }
        // Добавляем в очередь на сохранение
        if(level != 'Notification') this.pendingLogs.push(logEntry);
        
        // Запускаем отложенное сохранение
        this.scheduleSave();
    }

    static addLogEntry(level, source, message, timestamp = null) {
        this.log(level, source, message);
    }

    static addLogEntryToUI(level, source, message, timestamp = null) {
        if (!this.isLogLevelVisible(level)) return;

        const logEntries = document.getElementById('logEntries');
        if (!logEntries) return;

        const time = timestamp || new Date().toLocaleTimeString('ru-RU');
        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${level.toLowerCase()}`;
        logElement.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-level ${level.toLowerCase()}">${level}</span>
            <span class="log-source">${source}:</span>
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;

        // Добавляем анимацию появления
        logElement.style.opacity = '0';
        logEntries.prepend(logElement);
        
        setTimeout(() => {
            logElement.style.opacity = '1';
            logElement.style.transition = 'opacity 0.3s ease';
        }, 10);

        // Автопрокрутка, если включена
        if (this.autoScrollEnabled) {
            setTimeout(() => {
                logEntries.scrollTop = 0;
            }, 50);
        }
    }

    static scheduleSave() {
        // Если уже есть таймер, очищаем его
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Устанавливаем новый таймер на 5 секунд
        this.saveTimeout = setTimeout(() => {
            if (this.pendingLogs.length > 0) {
                this.savePendingLogs();
            }
        }, 10000);
    }

    static async savePendingLogs() {
        if (this.isSaving || this.pendingLogs.length === 0 || !window.ipcRenderer) {
            return;
        }

        this.isSaving = true;
        
        try {
            const logsToSave = [...this.pendingLogs];
            this.pendingLogs = [];
            
            const result = await window.ipcRenderer.invoke('save-log-file', {
                logs: logsToSave,
                timestamp: new Date().toISOString(),
                append: true // Добавляем к существующим логам
            });
            
            if (result.success) {
                 this.addLogEntry('Notification', 'LogManager', `Сохранено ${logsToSave.length} записей логов`);
            } else {
                console.error('Ошибка сохранения логов:', result.error);
                // Возвращаем логи обратно в очередь при ошибке
                this.pendingLogs.unshift(...logsToSave);
            }
        } catch (error) {
            console.error('Ошибка при сохранении логов:', error);
        } finally {
            this.isSaving = false;
        }
    }

    static filterLogs() {
        const logEntries = document.getElementById('logEntries');
        if (!logEntries) return;

        logEntries.innerHTML = '';
        
        const filteredLogs = this.currentLogLevel === 'ALL' 
            ? this.logs 
            : this.logs.filter(log => log.level === this.currentLogLevel);
        
        filteredLogs.forEach(log => {
            this.addLogEntryToUI(log.level, log.source, log.message, log.displayTime);
        });
    }

    static searchLogs(searchTerm) {
        const logEntries = document.getElementById('logEntries');
        if (!logEntries || !searchTerm) {
            this.filterLogs();
            return;
        }

        logEntries.innerHTML = '';
        const searchLower = searchTerm.toLowerCase();
        
        const filteredLogs = this.logs.filter(log => 
            (this.currentLogLevel === 'ALL' || log.level === this.currentLogLevel) &&
            (log.source.toLowerCase().includes(searchLower) || 
             log.message.toLowerCase().includes(searchLower))
        );
        
        filteredLogs.forEach(log => {
            this.addLogEntryToUI(log.level, log.source, log.message, log.displayTime);
        });
    }

    static isLogLevelVisible(level) {
        if (this.currentLogLevel === 'ALL') return true;
        
        const levelPriority = {
            'DEBUG': 0,
            'INFO': 1,
            'WARN': 2,
            'ERROR': 3,
            'CRITICAL': 4
        };
        
        return levelPriority[level] >= levelPriority[this.currentLogLevel];
    }

    static toggleLogWindow() {
        this.isLogWindowVisible = !this.isLogWindowVisible;
        const logWindow = document.getElementById('logWindow');
        
        if (logWindow) {
            if (this.isLogWindowVisible) {
                logWindow.classList.add('visible');
                this.filterLogs();
                
                // Фокус на поиск при открытии
                setTimeout(() => {
                    document.getElementById('logSearch')?.focus();
                }, 100);
            } else {
                logWindow.classList.remove('visible');
            }
        }
    }

    static clearLogs() {
        this.logs = [];
        this.pendingLogs = [];
        const logEntries = document.getElementById('logEntries');
        if (logEntries) {
            logEntries.innerHTML = '';
        }
        
        // Также очищаем файл логов
        this.clearLogFile();
        
        this.log('INFO', 'LogManager', 'Логи очищены');
    }

    static exportLogs() {
        if (!this.logs.length) {
            console.warn('Нет логов для экспорта');
            return;
        }

        const logText = this.logs.map(log => 
            `[${new Date(log.timestamp).toLocaleString('ru-RU')}] ${log.level} ${log.source}: ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Логи экспортированы в файл');
    }

    static async saveLogsToFile() {
        if (this.isSaving || !window.ipcRenderer) {
            console.warn('Сохранение уже выполняется или ipcRenderer недоступен');
            return;
        }

        this.isSaving = true;
        
        try {
            const result = await window.ipcRenderer.invoke('save-log-file', {
                logs: this.logs,
                timestamp: new Date().toISOString(),
                append: false // Перезаписываем файл
            });
            
            if (result.success) {
                console.log(`Все логи сохранены в файл: ${result.filePath}`);
                if (window.UIManager) {
                    window.UIManager.showNotification(`Логи сохранены в файл`);
                }
            } else {
                console.error('Ошибка сохранения логов:', result.error);
            }
        } catch (error) {
            console.error('Ошибка при сохранении логов:', error);
        } finally {
            this.isSaving = false;
        }
    }

    static async loadLogsFromFile() {
        if (!window.ipcRenderer) return;

        try {
            const result = await window.ipcRenderer.invoke('load-log-file');
            if (result.success && result.logs) {
                // Добавляем к существующим логам
                result.logs.forEach(log => {
                    this.logs.push({
                        timestamp: log.timestamp,
                        level: log.level,
                        source: log.source,
                        message: log.message,
                        displayTime: new Date(log.timestamp).toLocaleTimeString('ru-RU')
                    });
                });
                
                // Сортируем по времени (новые сверху)
                this.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                // Ограничиваем количество
                if (this.logs.length > this.maxLogEntries) {
                    this.logs = this.logs.slice(0, this.maxLogEntries);
                }
                
                console.log(`Загружено ${result.logs.length} записей логов`);
            }
        } catch (error) {
            console.error('Ошибка загрузки логов:', error);
        }
    }

    static async clearLogFile() {
        if (!window.ipcRenderer) return;

        try {
            await window.ipcRenderer.invoke('clear-log-file');
        } catch (error) {
            console.error('Error clearing log file:', error);
        }
    }

    static toggleAutoScroll() {
        this.autoScrollEnabled = !this.autoScrollEnabled;
        const button = document.querySelector('.log-window-footer .btn-autoscroll');
        if (button) {
            button.classList.toggle('active', this.autoScrollEnabled);
            console.log(`Автопрокрутка ${this.autoScrollEnabled ? 'включена' : 'выключена'}`);
        }
    }

    // Вспомогательные методы
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Методы для использования в других частях приложения
//    static debug(source, message) {
//        this.log('DEBUG', source, message);
//    }

    static debug(source, message, log = '') {
        this.log('DEBUG', source, message + `${log}`);
    }

    static info(source, message) {
        this.log('INFO', source, message);
    }

    static warn(source, message) {
        this.log('WARN', source, message);
    }

//    static error(source, message) {
//        this.log('ERROR', source, message);
//    }

    static error(source, message, error = '') {
        this.log('ERROR', source, message + `${error}`);
    }

    static critical(source, message) {
        this.log('CRITICAL', source, message);
    }

    // Метод для получения текущих логов (для других модулей)
    static getLogs(filter = null) {
        if (!filter) return this.logs;
        
        return this.logs.filter(log => 
            (!filter.level || log.level === filter.level) &&
            (!filter.source || log.source.includes(filter.source)) &&
            (!filter.message || log.message.includes(filter.message))
        );
    }

    // Метод для проверки наличия ошибок
    static hasErrors() {
        return this.logs.some(log => log.level === 'ERROR' || log.level === 'CRITICAL');
    }

    // Метод для получения последних логов
    static getRecentLogs(count = 10) {
        return this.logs.slice(0, Math.min(count, this.logs.length));
    }
}

window.LogManager = LogManager;
