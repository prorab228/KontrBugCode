// BoardManagementModal.js - оптимизированная версия
class BoardManagementModal {
    constructor() {
        this.modalId = 'boardManagementModal';
        this.installedCores = [];
        this.availableCores = [];
        this.additionalUrls = [];
        this.initialized = false;
        this.loading = false;
        this.installedCoresCache = null;
        this.cacheTime = null;
        this.CACHE_DURATION = 30000; // 30 секунд кэширования
        this.installProgressListeners = new Map(); // Для отслеживания прогресса установки

        console.log('BoardManagementModal создан');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('Инициализация BoardManagementModal...');


            // Настраиваем IPC listener для прогресса установки
            this.setupIpcListeners();

            this.initialized = true;
            console.log('BoardManagementModal инициализирован');
        } catch (error) {
            console.error('Ошибка инициализации BoardManagementModal:', error);
        }
    }

    setupIpcListeners() {
        if (!window.ipcRenderer) {
            console.warn('ipcRenderer не доступен для BoardManagementModal');
            return;
        }

        // Слушаем прогресс установки
        window.ipcRenderer.on('core-install-progress', (event, data) => {
            this.handleInstallProgress(data);
        });
    }





    setupModalTabs() {
        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        const tabButtons = modal.querySelectorAll('.tab-button');
        const tabContents = modal.querySelectorAll('.tab-content');

        if (!tabButtons.length || !tabContents.length) {
            console.error('Элементы вкладок не найдены');
            return;
        }

        const switchTab = (tabName) => {
            window.LogManager.debug('BoardManager',`Переключение на вкладку: ${tabName}`);

            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabName) {
                    btn.classList.add('active');
                }
            });

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabName}Tab`) {
                    content.classList.add('active');
                }
            });

            this.loadTabData(tabName);
        };

        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.target.dataset.tab;
                if (tabName) {
                    switchTab(tabName);
                }
            });
        });

        if (tabButtons.length > 0) {
            const firstTab = tabButtons[0].dataset.tab;
            switchTab(firstTab);
        }
    }



    async loadTabData(tabName) {
        try {
            window.LogManager.debug('BoardManager',`Загрузка данных для вкладки: ${tabName}`);

            if (!window.ipcRenderer) {
                console.error('ipcRenderer не доступен');
                return;
            }

            switch(tabName) {
                case 'cores':
                    await this.loadCoresDataFast();
                    break;
                case 'urls':
                    await this.loadUrlsData();
                    break;
                case 'diagnose':
                    // Диагностика загружается по запросу
                    break;
            }
        } catch (error) {
            console.error(`Ошибка загрузки данных для вкладки ${tabName}:`, error);
        }
    }

    async loadCoresDataFast() {
        if (this.loading) return;

        try {
            this.loading = true;
            window.LogManager.debug('BoardManager','Быстрая загрузка данных ядер...');

            const container = document.getElementById('coresListContainer');
            if (container) {
                container.innerHTML = '<div class="loading">Загрузка ядер...</div>';
            }

            const now = Date.now();
            if (this.installedCoresCache && this.cacheTime &&
                (now - this.cacheTime) < this.CACHE_DURATION) {
                window.LogManager.debug('BoardManager','Используем кэшированные установленные ядра');
                this.installedCores = this.installedCoresCache;
                this.showCoresUI();
                return;
            }

            await this.loadInstalledCoresFast();
            this.showCoresUI();

            setTimeout(() => {
                this.loadAvailableCoresBackground();
            }, 500);

        } catch (error) {
            window.LogManager.debug('BoardManager',`Ошибка загрузки данных ядер: ${error}`);
            window.UIManager.showNotification('Ошибка загрузки данных ядер', true);
        } finally {
            this.loading = false;
        }
    }

    async loadInstalledCoresFast() {
        try {
            window.LogManager.debug('BoardManager','Быстрая загрузка установленных ядер...');

            if (!window.ipcRenderer) {
                window.LogManager.error('BoardManager','ipcRenderer не доступен');
                return;
            }

            if (this.installedCoresCache) {
                this.installedCores = this.installedCoresCache;
                return;
            }

            const result = await window.ipcRenderer.invoke('get-installed-cores-fast');

            if (result.success) {
                this.installedCores = result.cores || [];
                this.installedCoresCache = this.installedCores;
                this.cacheTime = Date.now();
                window.LogManager.debug('BoardManager',`Загружено ${this.installedCores.length} установленных ядер`);
            } else {
                console.error('Ошибка получения установленных ядер:', result.error);
                this.installedCores = this.getFallbackCoresList();
            }
        } catch (error) {
            console.error('Ошибка загрузки установленных ядер:', error);
            this.installedCores = this.getFallbackCoresList();
        }
    }

    getFallbackCoresList() {
        return [
            { id: 'arduino:avr', name: 'Arduino AVR Boards', installed: true, version: '1.8.6' },
            { id: 'esp32:esp32', name: 'ESP32 Boards', installed: false },
            { id: 'esp8266:esp8266', name: 'ESP8266 Boards', installed: false }
        ].filter(core => core.installed);
    }

    async loadAvailableCoresBackground() {
        try {
            window.LogManager.debug('BoardManager','Фоновая загрузка доступных ядер...');

            if (!window.ipcRenderer) {
                return;
            }

            const result = await window.ipcRenderer.invoke('get-all-available-cores');
            if (result.success && result.cores) {
                this.availableCores = result.cores || [];
                const installedCoreIds = this.installedCores.map(core => core.id);
                this.availableCores = this.availableCores.filter(core =>
                    !installedCoreIds.includes(core.id)
                );

                window.LogManager.debug('BoardManager',`Загружено ${this.availableCores.length} доступных ядер`);

                const availableList = document.getElementById('availableCoresList');
                if (availableList && availableList.style.display !== 'none') {
                    this.updateCoresUI();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки доступных ядер:', error);
        }
    }

    showCoresUI() {
        const container = document.getElementById('coresListContainer');
        if (!container) return;

        let html = '';

        // Раздел: Установленные ядра
        html += `
            <div class="section">
                <div class="section-header">
                    <h4>Установленные ядра</h4>
                </div>
        `;

        if (this.installedCores.length === 0) {
            html += '<div class="empty-message">Нет установленных ядер</div>';
        } else {
            html += '<div class="cores-list">';

            this.installedCores.forEach(core => {
                const coreId = core.id || 'unknown';
                const coreName = core.name || coreId;
                const version = core.installedVersion || core.version || 'unknown';

                html += `
                    <div class="core-item installed">
                        <div class="core-info">
                            <div class="core-name">${coreName}</div>
                            <div class="core-details">
                                <span class="core-id">${coreId}</span>
                                <span class="core-version">${version}</span>
                            </div>
                        </div>
                        <div class="core-actions">
                            <button class="btn btn-danger btn-small uninstall-core-btn"
                                    data-core-id="${coreId}"
                                    onclick="boardManagementModal.uninstallCore('${coreId}')"
                                    title="Удалить ядро">
                                Удалить
                            </button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        html += '</div>';

        // Раздел: Доступные ядра
        html += `
            <div class="section">
                <div class="section-header">
                    <h4>Доступные ядра</h4>
                    <div class="tab-controls">
                        <input type="text" id="searchCoresInput"
                               placeholder="Поиск ядер..."
                               class="search-input"
                               onkeyup="boardManagementModal.filterAvailableCores()">
                        <button onclick="boardManagementModal.refreshAvailableCores()"
                                class="btn btn-secondary btn-small">
                            Обновить список
                        </button>
                    </div>
                </div>

                <div id="availableCoresList" class="cores-list available" style="display: none;">
                    <!-- Сюда загрузятся все доступные ядра -->
                </div>

                <div class="load-more">
                    <button onclick="boardManagementModal.showAllAvailableCores()"
                            class="btn btn-secondary btn-small">
                        Показать все доступные ядра
                    </button>
                </div>
        `;

        html += '</div>';

        container.innerHTML = html;
    }



    async showAllAvailableCores() {
        const availableList = document.getElementById('availableCoresList');
        const loadMoreBtn = document.querySelector('.load-more');

        if (!availableList) return;

        availableList.innerHTML = '<div class="loading">Загрузка доступных ядер...</div>';
        availableList.style.display = 'flex';

        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }

        if (this.availableCores.length === 0) {
            try {
                const result = await window.ipcRenderer.invoke('get-all-available-cores');
                if (result.success && result.cores) {
                    this.availableCores = result.cores || [];
                    const installedCoreIds = this.installedCores.map(core => core.id);
                    this.availableCores = this.availableCores.filter(core =>
                        !installedCoreIds.includes(core.id)
                    );
                }
            } catch (error) {
                console.error('Ошибка загрузки доступных ядер:', error);
            }
        }
        //Обновляем выпадающий список
        window.boardUIManager.refresh();
        this.updateCoresUI();
    }

    updateCoresUI() {
        const availableList = document.getElementById('availableCoresList');
        if (!availableList) return;

        if (this.availableCores.length === 0) {
            availableList.innerHTML = '<div class="empty-message">Нет доступных ядер</div>';
            return;
        }

        let html = '';

        this.availableCores.forEach(core => {
            const coreId = core.id || 'unknown';
            const coreName = core.name || coreId;
            const description = core.description || 'Нет описания';
            const latestVersion = core.latestVersion || 'неизвестно';
            const installedStatus = core.installed ? '✓ Установлено' : 'Не установлено';

            html += `
                <div class="core-item available" data-core-id="${coreId}">
                    <div class="core-info">
                        <div class="core-name">${coreName}</div>
                        <div class="core-details">
                            <span class="core-id">${coreId}</span>
                            ${latestVersion !== 'unknown' ? `<span class="core-version">v${latestVersion}</span>` : ''}
                            <span class="core-status ${core.installed ? 'installed' : 'not-installed'}">
                                ${installedStatus}
                            </span>
                        </div>
                        ${description !== 'Нет описания' ? `<div class="core-description">${description}</div>` : ''}
                    </div>
                    <div class="core-actions">
                        ${!core.installed ? `
                            <button class="btn btn-primary btn-small install-core-btn"
                                    data-core-id="${coreId}"
                                    onclick="boardManagementModal.installCore('${coreId}')"
                                    title="Установить ядро">
                                Установить
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        availableList.innerHTML = html;


    }

    async refreshAvailableCores() {
        try {
            window.UIManager.showNotification('Обновление списка доступных ядер...');

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer не доступен');
            }

            // Очищаем кэш в основном процессе
            await window.ipcRenderer.invoke('clear-available-cores-cache');

            // Загружаем свежие данные
            const result = await window.ipcRenderer.invoke('get-all-available-cores');
            if (result.success && result.cores) {
                this.availableCores = result.cores || [];
                const installedCoreIds = this.installedCores.map(core => core.id);
                this.availableCores = this.availableCores.filter(core =>
                    !installedCoreIds.includes(core.id)
                );

                // Обновляем UI
                const availableList = document.getElementById('availableCoresList');
                if (availableList && availableList.style.display !== 'none') {
                    this.updateCoresUI();
                }

                window.UIManager.showNotification('Список доступных ядер обновлен');
            }
        } catch (error) {
            console.error('Ошибка обновления доступных ядер:', error);
            window.UIManager.showNotification('Ошибка обновления списка ядер', true);
        }
    }

    filterAvailableCores() {
        const searchInput = document.getElementById('searchCoresInput');
        if (!searchInput) return;

        const searchTerm = searchInput.value.toLowerCase();

        if (searchTerm) {
            const availableList = document.getElementById('availableCoresList');
            const loadMoreBtn = document.querySelector('.load-more');

            this.showAllAvailableCores();

            setTimeout(() => {
                const cores = availableList.querySelectorAll('.core-item.available');
                let visibleCount = 0;

                cores.forEach(core => {
                    const coreId = core.dataset.coreId || '';
                    const coreName = core.querySelector('.core-name')?.textContent || '';
                    const coreDescription = core.querySelector('.core-description')?.textContent || '';

                    const match = coreId.toLowerCase().includes(searchTerm) ||
                                 coreName.toLowerCase().includes(searchTerm) ||
                                 coreDescription.toLowerCase().includes(searchTerm);

                    core.style.display = match ? 'flex' : 'none';
                    if (match) visibleCount++;
                });

                if (visibleCount === 0) {
                    availableList.innerHTML = '<div class="empty-message">По запросу ничего не найдено</div>';
                }
            }, 100);
        }
    }

    async loadUrlsData() {
        try {
            window.LogManager.debug('BoardManager','Загрузка данных URL...');

            if (!window.ipcRenderer) {
                console.error('ipcRenderer не доступен');
                return;
            }

            const container = document.getElementById('urlsListContainer');
            if (container) {
                container.innerHTML = '<div class="loading">Загрузка URL...</div>';
            }

            try {
                const result = await window.ipcRenderer.invoke('get-additional-urls-fast');
                if (result.success) {
                    this.additionalUrls = result.urls || [];
                }
            } catch (error) {
                window.LogManager.debug('BoardManager','Используем fallback метод для URL');
                const cachedUrls = localStorage.getItem('additionalUrls');
                if (cachedUrls) {
                    this.additionalUrls = JSON.parse(cachedUrls);
                }
            }

            this.updateUrlsUI();
        } catch (error) {
            console.error('Ошибка загрузки данных URL:', error);
            this.updateUrlsUI();
        }
    }

    updateUrlsUI() {
        const container = document.getElementById('urlsListContainer');
        if (!container) return;

        let html = `
            <div class="section">
        `;

        if (this.additionalUrls.length === 0) {
            html += '<div class="empty-message">Нет дополнительных URL</div>';
        } else {
            html += '<div class="urls-list">';

            this.additionalUrls.forEach(url => {
                html += `
                    <div class="url-item">
                        <div class="url-text">${url}</div>
                        <div class="url-actions">
                            <button class="btn btn-danger btn-small remove-url-btn"
                                    data-url="${url}"
                                    onclick="boardManagementModal.removeAdditionalUrl('${url}')";
                                    title="Удалить URL">
                                Удалить
                            </button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;
    }

    async refreshCoresData() {
        try {
            window.UIManager.showNotification('Обновление данных ядер...');
            this.installedCoresCache = null;
            this.cacheTime = null;
            await this.loadCoresDataFast();
            await this.refreshAvailableCores();
            window.UIManager.showNotification('Данные ядер обновлены');
            //Обновляем выпадающий список
            window.boardUIManager.refresh();
        } catch (error) {
            console.error('Ошибка обновления данных ядер:', error);
            window.UIManager.showNotification('Ошибка обновления данных ядер', true);
        }
    }

    async updateCoreIndex() {
        try {
            window.UIManager.showNotification('Обновление индекса ядер...');

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer не доступен');
            }

            const result = await window.ipcRenderer.invoke('update-core-index');

            if (result.success) {
                window.UIManager.showNotification('Индекс ядер успешно обновлен');
                setTimeout(() => {
                    this.refreshAvailableCores();
                }, 1000);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Ошибка обновления индекса ядер:', error);
            window.UIManager.showNotification(`Ошибка обновления: ${error.message}`, true);
        }
    }

 // В метод installCore добавьте очистку логов перед началом установки
    async installCore(coreId) {
        if (!coreId) return;

        if (!confirm(`Установить ядро: ${coreId}?\nЭто может занять несколько минут.`)) return;

        try {

            // Показываем начальное сообщение
            window.UIManager.updateLogOutput(`Начало установки ядра ${coreId}...`);

            window.UIManager.showNotification(`Установка ядра ${coreId}...`, false, true);

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer не доступен');
            }

            const result = await window.ipcRenderer.invoke('install-core', coreId);

            if (result.success) {
                //Обновляем выпадающий список
                window.boardUIManager.refresh();
                this.updateInstallProgress(coreId, 'complete', `Ядро ${coreId} успешно установлено!`, Date.now());
                window.UIManager.showNotification(`Ядро ${coreId} успешно установлено`);
                this.installedCoresCache = null;
                setTimeout(() => {
                    this.refreshCoresData();
                }, 2000);
            } else {
                this.updateInstallProgress(coreId, 'error', `Ошибка: ${result.message}`, Date.now());
                throw new Error(result.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error(`Ошибка установки ядра ${coreId}:`, error);
            this.updateInstallProgress(coreId, 'error', `Ошибка установки: ${error.message}`, Date.now());
            window.UIManager.showNotification(`Ошибка установки: ${error.message}`, true);

            // Для больших ядер предлагаем альтернативы
            if (error.message.includes('timeout') || error.message.includes('Таймаут')) {
                setTimeout(() => {
                    this.showManualInstallInstructions(coreId);
                }, 1000);
            }
        }
    }

    showManualInstallInstructions(coreId) {
        const instructions = `
            Ядро ${coreId} очень большое и не успело установиться за отведенное время.

            Рекомендации:
            1. Проверьте скорость интернета
            2. Установите ядро вручную через командную строку:
               arduino-cli core install ${coreId}
            3. Или скачайте архив ядра и установите его вручную
        `;

        this.updateInstallProgress(coreId, 'info', instructions, Date.now());

        // Также показываем уведомление
        if (confirm(`Ядро ${coreId} слишком большое для автоматической установки.\n\nПоказать инструкцию по ручной установке?`)) {
            alert(instructions);
        }
    }

    async uninstallCore(coreId) {
        if (!coreId) return;

        if (!confirm(`Удалить ядро: ${coreId}?\n\nВнимание: Будут удалены все связанные платы.`)) return;

        try {
            window.UIManager.showNotification(`Удаление ядра ${coreId}...`);

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer не доступен');
            }

            const result = await window.ipcRenderer.invoke('uninstall-core', coreId);

            if (result.success) {
                //Обновляем выпадающий список
                window.boardUIManager.refresh();
                window.UIManager.showNotification(`Ядро ${coreId} успешно удалено`);
                this.installedCoresCache = null;
                setTimeout(() => {
                    this.refreshCoresData();
                }, 2000);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error(`Ошибка удаления ядра ${coreId}:`, error);
            window.UIManager.showNotification(`Ошибка удаления: ${error.message}`, true);
        }
    }


    handleInstallProgress(data) {
        const { coreId, type, data: message, timestamp } = data;

        window.LogManager.debug('BoardManager',`Install progress for ${coreId}:`, { type, message: message.substring(0, 100) });

        // Обновляем UI с прогрессом
        this.updateInstallProgress(coreId, type, message, timestamp);
    }

    updateInstallProgress(coreId, type, message, timestamp) {

        // Форматируем сообщение
        let formattedMessage = message;
        if (type === 'progress') {
            // Извлекаем прогресс загрузки
            const progressMatch = message.match(/(\d+\.\d+\s*(?:MiB|KiB))\s*\/\s*(\d+\.\d+\s*(?:MiB|KiB))\s*(\d+\.\d+)%/);
            if (progressMatch) {
                formattedMessage = `Загружено: ${progressMatch[1]} из ${progressMatch[2]} (${progressMatch[3]}%)`;
            }
        }
        window.UIManager.appendLogOutput(formattedMessage);

    }

    async addAdditionalUrl() {
        const urlInput = document.getElementById('additionalUrlInput');
        if (!urlInput || !urlInput.value.trim()) {
            window.UIManager.showNotification('Введите URL', true);
            return;
        }

        const url = urlInput.value.trim();

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            window.UIManager.showNotification('URL должен начинаться с http:// или https://', true);
            return;
        }

        try {
            window.UIManager.showNotification('Добавление URL...');

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer не доступен');
            }
            const result = await window.ipcRenderer.invoke('add-additional-url', url);

            if (result.success) {
                urlInput.value = '';
                this.additionalUrls.push(url);
                localStorage.setItem('additionalUrls', JSON.stringify(this.additionalUrls));

                await this.loadUrlsData();
                window.UIManager.showNotification('URL успешно добавлен');

                if (confirm('Обновить индекс ядер для получения новых плат?')) {
                    await this.updateCoreIndex();
                }
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Ошибка добавления URL:', error);
            window.UIManager.showNotification(`Ошибка добавления: ${error.message}`, true);
        }
    }

    async removeAdditionalUrl(url) {
        if (!url) return;

        if (!confirm(`Удалить URL: ${url}?`)) return;

        try {
            window.UIManager.showNotification('Удаление URL...');

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer не доступен');
            }

            const result = await window.ipcRenderer.invoke('remove-additional-url', url);

            if (result.success) {
                this.additionalUrls = this.additionalUrls.filter(u => u !== url);
                localStorage.setItem('additionalUrls', JSON.stringify(this.additionalUrls));

                await this.loadUrlsData();
                window.UIManager.showNotification('URL успешно удален');
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Ошибка удаления URL:', error);
            window.UIManager.showNotification(`Ошибка удаления: ${error.message}`, true);
        }
    }

    async diagnose() {
        try {
            window.UIManager.showNotification('Запуск диагностики...');

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer не доступен');
            }

            const result = await window.ipcRenderer.invoke('diagnose-arduino-cli');

            if (result.success) {
                this.showDiagnosisResults(result.results);
                window.UIManager.showNotification('Диагностика завершена');
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Ошибка диагностики:', error);
            window.UIManager.showNotification(`Ошибка диагностики: ${error.message}`, true);
        }
    }

    showDiagnosisResults(results) {
        const container = document.getElementById('diagnosisResults');
        if (!container) return;

        let html = `
            <div class="section">
                <div class="diagnosis-summary">
                    <h4>Результаты диагностики</h4>
                    <div class="summary-grid">
                        <div class="${results.arduinoCliValid ? 'success' : 'error'}">
                            <div >Arduino CLI: ${results.arduinoCliValid ? '✓ Работает' : '✗ Ошибка'}</div>
                        </div>
                        <div class="summary-item">
                            <div >Установлено ядер: ${results.installedCoresCount || 0}</div>
                        </div>
                        <div class="summary-item">
                            <div>Дополнительные URL ${results.additionalUrls || 0}</div>
                        </div>
                    </div>
                </div>
        `;

        html += `
            <div class="diagnosis-paths">
                <h5>Пути</h5>
                <div class="path-item">
                    <strong>Arduino15:</strong> ${results.arduino15Path || 'Не найден'}
                </div>
                <div class="path-item">
                    <strong>Arduino CLI:</strong> ${results.arduinoCliPath || 'Не найден'}
                </div>
            </div>
        `;

        if (results.arduinoCliError) {
            html += `
                <div class="diagnosis-error">
                    <h5>Ошибка Arduino CLI</h5>
                    <div class="error-message">${results.arduinoCliError}</div>
                    <div class="error-solution">
                        <p><strong>Решение:</strong> Установите или обновите arduino-cli</p>
                        <button onclick="installArduinoCLI()" class="btn btn-warning btn-small">
                            Установить Arduino CLI
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    showModal()
    {
       // alert('boardManagementModal');
        setTimeout(() => {
                    this.setupModalTabs();
                    this.loadCoresData();
                }, 100);
           // instance.showModal();
            window.UIManager.showModal(this.modalId);
    }

}

if (typeof window !== 'undefined') {
    window.BoardManagementModal = BoardManagementModal;

    let boardManagementModalInstance = null;

    function initializeBoardManagementModal() {
        if (!boardManagementModalInstance) {
            boardManagementModalInstance = new BoardManagementModal();
            window.boardManagementModal = boardManagementModalInstance;

            setTimeout(() => {
                boardManagementModalInstance.init();
            }, 1000);
        }
        return boardManagementModalInstance;
    }

    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing BoardManagementModal...');
        initializeBoardManagementModal();
    });
}