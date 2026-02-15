class BoardManager {
    constructor() {
        this.currentBoard = localStorage.getItem('selectedBoard') || 'uno';
        this.boardConfigs = this.getBoardConfigs();
    }

    init() {
        this.setupBoardSelector();
        this.updatePinInfo();
    }

    setupBoardSelector() {
        const boardSelect = document.getElementById('boardSelect');
        if (boardSelect) {
            boardSelect.value = this.currentBoard;

            boardSelect.addEventListener('change', (e) => {
                this.currentBoard = e.target.value;
                localStorage.setItem('selectedBoard', this.currentBoard);
                this.updatePinInfo();
                this.updateAllBlocks();
                this.showBoardNotification();
            });
        }
    }

    getBoardConfigs() {
        return {
            'uno': {
                name: 'Arduino Uno',
                digital: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
                analog: ['A0','A1','A2','A3','A4','A5'],
                pwm: [3,5,6,9,10,11]
            },
            'nano': {
                name: 'Arduino Nano',
                digital: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
                analog: ['A0','A1','A2','A3','A4','A5','A6','A7'],
                pwm: [3,5,6,9,10,11]
            },
            'mega': {
                name: 'Arduino Mega 2560',
                digital: Array.from({length: 54}, (_, i) => i),
                analog: Array.from({length: 16}, (_, i) => `A${i}`),
                pwm: [2,3,4,5,6,7,8,9,10,11,12,13]
            },
            'esp8266': {
                name: 'ESP8266 (NodeMCU)',
                digital: [0,1,2,3,4,5,12,13,14,15,16],
                analog: ['A0'],
                pwm: [0,1,2,3,4,5,12,13,14,15,16]
            },
            'esp32': {
                name: 'ESP32',
                digital: Array.from({length: 34}, (_, i) => i),
                analog: Array.from({length: 18}, (_, i) => `A${i}`),
                pwm: Array.from({length: 34}, (_, i) => i)
            },
            'leonardo': {
                name: 'Arduino Leonardo',
                digital: Array.from({length: 20}, (_, i) => i),
                analog: Array.from({length: 12}, (_, i) => `A${i}`),
                pwm: [3,5,6,9,10,11,13]
            },
            'zero': {
                name: 'КонтрБаг ZERO',
                digital: Array.from({length: 22}, (_, i) => i),
                analog: Array.from({length: 8}, (_, i) => `A${i}`),
                pwm: [3,5,6,9,10,11]
            }
        };
    }

    getCurrentBoard() {
        return this.boardConfigs[this.currentBoard] || this.boardConfigs.uno;
    }

    // УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ПИНОВ
    getPins(pinType = 'digital') {
        const board = this.getCurrentBoard();
        const pins = board[pinType] || board.digital;

        // Форматируем вывод для меню
        switch(pinType) {
            case 'pwm':
                return pins.map(pin => [`${pin} (PWM)`, pin.toString()]);
            case 'analog':
                return pins.map(pin => [pin.toString(), pin.toString()]);
            default: // digital
                return pins.map(pin => [pin.toString(), pin.toString()]);
        }
    }

    updatePinInfo() {
        const board = this.getCurrentBoard();
        const statusBar = document.getElementById('status');
        if (statusBar) {
            statusBar.innerHTML =
                `Плата: ${board.name} | Цифровые: ${board.digital.length} | Аналоговые: ${board.analog.length} | PWM: ${board.pwm.length}`;
        }
    }

    getBoardInfo()
    {
        const board = this.getCurrentBoard();
        return `Плата: ${board.name} | Цифровые: ${board.digital.length} | Аналоговые: ${board.analog.length} | PWM: ${board.pwm.length}`;
    }

    // УМНОЕ ОБНОВЛЕНИЕ ВСЕХ БЛОКОВ
    updateAllBlocks() {
        if (!window.workspace) return;

        const blocks = window.workspace.getAllBlocks(false);
        let updatedCount = 0;

        blocks.forEach(block => {
            if (this.updateBlock(block)) {
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            window.workspace.render();
            if (window.UIManager) {
                window.UIManager.showNotification(
                    `Пины обновлены для платы: ${this.getCurrentBoard().name} ✅`,
                    false,
                    2000
                );
            }
        }
    }

    // УМНОЕ ОБНОВЛЕНИЕ БЛОКА - ОБНОВЛЯЕТ ТОЛЬКО ПОЛЯ С ПИНАМИ
    updateBlock(block) {
        let updated = false;

        // Проходим по всем полям блока
        block.inputList.forEach(input => {
            input.fieldRow.forEach(field => {
                if (field instanceof Blockly.FieldDropdown) {
                    // ПРОВЕРЯЕМ, ЯВЛЯЕТСЯ ЛИ ПОЛЕ ВЫБОРОМ ПИНА
                    if (this.isPinField(field)) {
                        const pinType = this.detectPinType(field);
                        const newMenu = this.getPins(pinType);

                        // Сохраняем текущее значение
                        const currentValue = field.getValue();

                        // Обновляем меню
                        field.menuGenerator_ = () => newMenu;

                        // Проверяем текущее значение
                        const isValid = newMenu.some(item => item[1] === currentValue);
                        if (!isValid && newMenu.length > 0) {
                            field.setValue(newMenu[0][1]);
                        }

                        updated = true;
                    }
                }
            });
        });

        return updated;
    }

    // ОПРЕДЕЛЯЕМ, ЯВЛЯЕТСЯ ЛИ ПОЛЕ ВЫБОРОМ ПИНА
    isPinField(field) {
        const menu = field.menuGenerator_ ?
            (typeof field.menuGenerator_ === 'function' ? field.menuGenerator_() : field.menuGenerator_) :
            [];

        if (menu.length === 0) return false;

        // Поля с пинами обычно содержат числа или обозначения A0, A1 и т.д.
        const firstItem = menu[0][0];

        // Если это поле состояния (HIGH/LOW), пропускаем
        if (firstItem === 'ВКЛ' || firstItem === 'HIGH' || firstItem === 'LOW' || firstItem === 'ВЫКЛ') {
            return false;
        }

        // Если это поле режима (INPUT/OUTPUT), пропускаем
        if (firstItem === 'INPUT' || firstItem === 'OUTPUT' || firstItem === 'INPUT_PULLUP') {
            return false;
        }

        // Если это поле прерывания (RISING/FALLING), пропускаем
        if (firstItem === 'RISING' || firstItem === 'FALLING' || firstItem === 'CHANGE' || firstItem === 'LOW') {
            return false;
        }

        // Поля с пинами обычно содержат числа или A0, A1, либо имеют (PWM)
        return /\d|A\d|\(PWM\)/.test(firstItem);
    }

    // ОПРЕДЕЛЯЕМ ТИП ПИНОВ ПО СОДЕРЖИМОМУ ПОЛЯ
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

    showBoardNotification() {
        const board = this.getCurrentBoard();
        if (window.UIManager) {
            window.UIManager.showNotification(
                `Плата изменена на: ${board.name} ✅`,
                false,
                2000
            );
        }
    }

    // Простая валидация пина
    isValidPin(pin, type = 'digital') {
        const board = this.getCurrentBoard();
        const pins = board[type] || board.digital;
        const pinValue = typeof pin === 'string' && pin.startsWith('A') ? pin : parseInt(pin);
        return pins.includes(pinValue);
    }
}

window.BoardManager = new BoardManager();