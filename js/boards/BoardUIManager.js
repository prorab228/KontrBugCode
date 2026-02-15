// BoardUIManager.js
class BoardUIManager {
    constructor() {
        this.currentBoardId = 'contrbugzero';
        this.boardCategories = new Map();
        this.boards = new Map();
        this.initialized = false;

        console.log('BoardUIManager created');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('BoardUIManager initializing...');

            // Ждем, пока появится ipcRenderer
            await this.waitForIpcRenderer();

            // Загружаем платы
            await this.loadBoards();

            // Заполняем селект
            this.populateBoardSelect();

            // Настраиваем обработчики
            this.setupEventListeners();

            this.initialized = true;
            console.log('BoardUIManager initialized successfully');

        } catch (error) {
            console.error('BoardUIManager init failed:', error);
        }
    }

    async waitForIpcRenderer() {
        const maxAttempts = 10;
        let attempts = 0;

        while (attempts < maxAttempts) {
            if (window.ipcRenderer) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        throw new Error('ipcRenderer not available after 1 second');
    }

    async loadBoards() {
        try {
            window.LogManager.debug('BoardManager','Loading boards from main process...');

            if (!window.ipcRenderer) {
                throw new Error('ipcRenderer not available');
            }

            // Получаем категории плат
            const result = await window.ipcRenderer.invoke('get-board-categories');

            if (result.success && result.categories) {
                this.boardCategories.clear();
                this.boards.clear();

                // Преобразуем объект в Map
                for (const [category, boardList] of Object.entries(result.categories)) {
                    this.boardCategories.set(category, boardList);

                    // Добавляем платы в общую карту
                    boardList.forEach(board => {
                        this.boards.set(board.id, board);
                    });
                }

                window.LogManager.debug('BoardManager', `Loaded ${this.boards.size} boards in ${this.boardCategories.size} categories`);
            } else {
                window.LogManager.debug('BoardManager',`Failed to load boards: ${result.error}`);
            }

        } catch (error) {
            console.error('Error loading boards:', error);
            this.createBoardsMap();
        }
    }

    createBoardsMap() {
        this.boards.clear();

        for (const [category, boardList] of this.boardCategories) {
            boardList.forEach(board => {
                this.boards.set(board.id, board);
            });
        }
    }

    async updateBoardSelect()
    {
         // Загружаем платы
        await this.loadBoards();
        // Заполняем селект
        this.populateBoardSelect();
    }
    populateBoardSelect() {
        const boardSelect = document.getElementById('boardSelect');
        if (!boardSelect) {
            console.error('boardSelect element not found');
            return;
        }

        const currentValue = boardSelect.value || this.currentBoardId;

        // Очищаем селект
        boardSelect.innerHTML = '';

        // Добавляем опцию по умолчанию
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите плату...';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        boardSelect.appendChild(defaultOption);

        // Добавляем платы по категориям
        for (const [category, boardList] of this.boardCategories) {
            // Пропускаем пустые категории
            if (!boardList || boardList.length === 0)
             {
                continue;
             }

            const optgroup = document.createElement('optgroup');
            optgroup.label = category;

            // Сортируем платы по имени
            const sortedBoards = [...boardList].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '')
            );

            sortedBoards.forEach(board => {
                const option = document.createElement('option');
                option.value = board.id;

                let displayName = board.name || board.id;
                if (board.installed) {
                    displayName += ' ✓';
                }
                if (board.isBuiltIn) {
                    displayName += ' (встроенная)';
                }

                option.textContent = displayName;
                option.dataset.installed = board.installed || false;
                optgroup.appendChild(option);
            });

            boardSelect.appendChild(optgroup);
        }

        // Восстанавливаем выбранное значение
        if (this.boards.has(currentValue)) {
            boardSelect.value = currentValue;
            this.currentBoardId = currentValue;
        } else if (this.boards.size > 0) {
            // Выбираем первую доступную плату
            const firstBoardId = Array.from(this.boards.keys())[0];
            boardSelect.value = firstBoardId;
            this.currentBoardId = firstBoardId;
        }

        console.log(`Board select populated with ${this.boards.size} boards in ${this.boardCategories.size} categories`);

        // Запускаем обработчик изменения для обновления UI
        setTimeout(() => {
            this.handleBoardChange(this.currentBoardId);
        }, 100);
    }

    setupEventListeners() {
        console.log('Setting up board event listeners...');

        // Обработчик изменения основной платы
        const boardSelect = document.getElementById('boardSelect');
        if (boardSelect) {
            boardSelect.addEventListener('change', (e) => {
                const boardId = e.target.value;
                console.log('Board changed to:', boardId);
                this.handleBoardChange(boardId);

            });

//            boardSelect.addEventListener('click', (e) => {
//                this.refresh();
//            });
        } else {
            window.LogManager.debug('BoardUIManager','boardSelect element not found for event listener');
        }

    }

    async handleBoardChange(boardId) {
        if (!boardId) return;

        this.currentBoardId = boardId;

        // Сохраняем выбор
        localStorage.setItem('lastSelectedBoard', boardId);

        // Получаем информацию о плате
        const board = this.boards.get(boardId);
        if (!board) {
            console.error(`Board not found: ${boardId}`);
            return;
        }

        console.log(`Selected board: ${board.name} (${boardId})`);

        // Обновляем статус
        this.updateStatus(board);

        // Обновляем блоки Blockly
        setTimeout(() => {
            this.updateBlocklyBlocks(board);
        }, 100);
    }

    updateStatus(board) {
        let status = `${board.name}`;

        if (board.installed) {
            status += ' ✓ Установлена';
        } else if (board.isBuiltIn) {
            status += ' (встроенная)';
        } else {
            status += ' ⚠ Не установлена';
        }

        if (window.UIManager && window.UIManager.setStatus) {
            window.UIManager.setStatus(status);
        }
    }

    updateBlocklyBlocks(board) {
        if (!window.workspace || !window.Blockly) {
            console.log('Blockly not available, skipping block update');
            return;
        }

        if (!board || !board.pins) {
            console.warn('Board or pins are undefined, skipping block update');
            return;
        }

        console.log(`Updating Blockly blocks for board: ${board.name}`);

        // Обновляем блоки с пинами
        const blocks = window.workspace.getAllBlocks();
        let updatedBlocks = 0;

        blocks.forEach(block => {
            if (block.type && this.isPinBlock(block.type)) {
                this.updateBlockPins(block, board);
                updatedBlocks++;
            }
        });

        if (updatedBlocks > 0) {
            window.workspace.render();
            console.log(`Updated ${updatedBlocks} blocks for board ${board.name}`);
            window.UIManager.showNotification(`Пины обновлены для платы: ${board.name} ✅`,false,2000);
        }
    }

    isPinBlock(blockType) {
        const pinBlocks = [
            'pin_mode', 'digital_write', 'digital_read',
            'analog_write', 'analog_read', 'pwm_write'
        ];
        return pinBlocks.includes(blockType);
    }

    updateBlockPins(block, board) {
        if (!block || !block.inputList) return;

        block.inputList.forEach(input => {
            if (input && input.fieldRow) {
                input.fieldRow.forEach(field => {
                    if (field && field.name === 'PIN') {
                        const pinType = this.detectPinType(field);
                        const newMenu = this.generatePinOptions(board, pinType);
                        // Сохраняем текущее значение
                        const currentValue = field.getValue();
                        // Обновляем генератор опций
                       // alert(pinType);
                        field.menuGenerator_ = () => newMenu;
                      //  alert(field.menuGenerator_);

                        // Проверяем текущее значение
                        const isValid = newMenu.some(item => item[1] === currentValue);
                        if (!isValid && newMenu.length > 0) {
                            field.setValue(newMenu[0][1]);
                        }
                    }
                });
            }
        });
    }

    detectPinType(field) {
        const menu = field.menuGenerator_ ?
            (typeof field.menuGenerator_ === 'function' ? field.menuGenerator_() : field.menuGenerator_) :
            [];

        if (menu.length === 0) return 'digital';

        const firstItem = menu[0][0];

        if (firstItem.includes('(PWM)')) return 'pwm';
        if (firstItem.includes('A')) return 'analog';

        return 'digital';
    }

    generatePinOptions(board, pinType) {
        if (!board || !board.pins) {
            console.warn('Board or pins are undefined, returning default pin options');
            return [['Цифровой 0', '0'], ['Цифровой 1', '1']];
        }

        const pins = board.pins;
        const options = [];
        if(pinType=='analog')
        {
            // Аналоговые пины
            const analogCount = pins.analog || 6;
            for (let i = 0; i < analogCount; i++) {
                options.push([`Аналоговый A${i}`, `A${i}`]);
            }
        }
        else
        {   // Цифровые пины
            const digitalCount = pins.digital || 14;
            for (let i = 0; i < digitalCount; i++) {
                let label = `Цифровой ${i}`;

                if (Array.isArray(pins.pwm) && pins.pwm.includes(i) || pins.pwm === 'all') {
                    label += ' (PWM)';
                }

                options.push([label, i.toString()]);
            }
        }

        return options;
    }

    getCurrentBoard() {
        return this.boards.get(this.currentBoardId);
    }

    async refresh() {
        console.log('Refreshing boards list...');

        // Показываем статус
        if (window.UIManager && window.UIManager.setStatus) {
            window.UIManager.setStatus('Обновление списка плат...');
        }

        try {
            await this.loadBoards();
            this.populateBoardSelect();

            if (window.UIManager && window.UIManager.showNotification) {
                window.UIManager.showNotification('Список плат обновлен');
            }
        } catch (error) {
            console.error('Error refreshing boards:', error);

            if (window.UIManager && window.UIManager.showNotification) {
                window.UIManager.showNotification('Ошибка обновления списка плат', true);
            }
        }
    }
}

// Экспорт для рендерера
if (typeof window !== 'undefined') {
    window.BoardUIManager = BoardUIManager;

    // Создаем экземпляр
    let boardUIManagerInstance = null;

    function initializeBoardUIManager() {
        if (!boardUIManagerInstance) {
            boardUIManagerInstance = new BoardUIManager();
            window.boardUIManager = boardUIManagerInstance

            // Инициализируем после небольшой задержки
            setTimeout(() => {
                boardUIManagerInstance.init();
            }, 1000);
        }
        return boardUIManagerInstance;
    }

    // Инициализация при загрузке DOM
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing BoardUIManager...');
        initializeBoardUIManager();
    });

    // Экспортируем функцию для ручной инициализации
    window.initializeBoardUIManager = initializeBoardUIManager;
}