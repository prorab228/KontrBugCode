class ConnectionHelper {
    static init() {
        this.connectionMap = {
//            'motor_dc': {
//                zero: {
//                    image: 'images/zero_dc_motor.png',
//                    description: 'Подключение DC мотора к драйверу L9110S',
//                    pins: ['PIN1 → A-1A', 'PIN2 → A-1B', 'GND → GND', 'VCC → 5V']
//                }
//            },
            'controlbug_motors': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_controlbug_motors.png',
                    description: 'Подключение моторов КонтрБаг ZERO',
                    pins: [
                        'Левый мотор → M1',
                        'Правый мотор+ → M2',
                    ]
                }
            },
            'motor_servo': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_servo.png',
                    description: 'Подключение сервомотора',
                    pins: ['SIGNAL → D9', 'VCC → 5V', 'GND → GND']
                }
            },
            'sensor_ultrasonic': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_ultrasonic.png',
                    description: 'Подключение ультразвукового датчика HC-SR04',
                    pins: ['VCC → 5V', 'TRIG → D2', 'ECHO → D3', 'GND → GND']
                }
            },
            'sensor_ir_obstacle': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_ir_obstacle.png',
                    description: 'Подключение ИК датчика препятствий',
                    pins: ['VCC → 5V', 'OUT → D7', 'GND → GND']
                }
            },
            'sensor_ir_line': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_ir_obstacle.png',
                    description: 'Подключение ИК датчика линии',
                    pins: ['VCC → 5V', 'OUT → D6', 'GND → GND']
                }
            },
            'sensor_button': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_button.png',
                    description: 'Подключение тактовой кнопки',
                    pins: ['PIN → D4', 'GND → GND (через подтягивающий резистор)']
                }
            },
            'sensor_sound': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_sound.png',
                    description: 'Подключение датчика звука',
                    pins: ['VCC → 5V', 'OUT → A0', 'GND → GND']
                }
            },
            'display_oled_text': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_oled.png',
                    description: 'Подключение OLED дисплея 128x64',
                    pins: ['VCC → 5V', 'GND → GND', 'SCL → A5', 'SDA → A4']
                }
            },
            'bluetooth_send': {
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_bluetooth.png',
                    description: 'Подключение Bluetooth модуля HC-05/06',
                    pins: ['VCC → 5V', 'GND → GND', 'TX → D10', 'RX → D11']
                }
            },
            'sensor_vl53lox':{
                contrbugzero: {
                    image: 'assets/images/connection_helper/zero_sensor_vl53lox.png',
                    description: 'Подключение лазерного дальномера vl53lox',
                    pins: ['VCC → 5V', 'GND → GND', 'SCL → A5', 'SDA → A4']
                }
            }
        };

        this.setupHoverEvents();
        console.log('ConnectionHelper initialized');
    }

    static setupHoverEvents() {
        // Используем делегирование событий для работы с динамически создаваемыми блоками
        document.addEventListener('mouseover', (e) => {
            const block = this.findBlockElement(e.target);
            if (block) {
                const blockType = this.getBlockType(block);
                if (blockType && this.connectionMap[blockType]) {
                    this.showConnectionHint(blockType, e.clientX, e.clientY);
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (!e.relatedTarget || !this.findBlockElement(e.relatedTarget)) {
                this.hideConnectionHint();
            }
        });

        // Скрываем подсказку при клике в любом месте
        document.addEventListener('click', () => {
            this.hideConnectionHint();
        });

        // Скрываем подсказку при скролле
        document.addEventListener('scroll', () => {
            this.hideConnectionHint();
        });
    }

    static findBlockElement(element) {
        // Ищем элемент блока вверх по DOM
        let currentElement = element;
        while (currentElement && currentElement !== document.body) {
            if (currentElement.classList &&
                (currentElement.classList.contains('blocklyDraggable') ||
                 currentElement.classList.contains('blocklyBlockCanvas'))) {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
        return null;
    }

    static getBlockType(blockElement) {
        try {
            // Получаем workspace
            const workspace = Blockly.getMainWorkspace();
            if (!workspace) return null;

            // Ищем блок по координатам или другим атрибутам
            const allBlocks = workspace.getAllBlocks(false);

            // Простой способ: ищем блок по позиции или другим характеристикам
            for (const block of allBlocks) {
                const svg = block.getSvgRoot();
                if (svg && svg.contains(blockElement)) {
                    return block.type;
                }
            }

            // Альтернативный метод: через data-атрибуты
            if (blockElement.hasAttribute('data-block-type')) {
                return blockElement.getAttribute('data-block-type');
            }

        } catch (error) {
            console.warn('Error getting block type:', error);
        }
        return null;
    }

    static showConnectionHint(blockType, x, y) {
        const board = document.getElementById('boardSelect')?.value || 'zero';
        const connectionInfo = this.connectionMap[blockType]?.[board];

        if (!connectionInfo) {
            console.log('No connection info for:', blockType, 'on board:', board);
            return;
        }

        let hint = document.getElementById('connectionHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'connectionHint';
            hint.className = 'connection-hint';
            document.body.appendChild(hint);
        }

        // Формируем HTML для подсказки
        hint.innerHTML = `
            <div class="hint-header">
                <strong>🔌 Схема подключения</strong>
            </div>
            <div class="hint-content">
                <div class="hint-image">
                    ${connectionInfo.image ?
                        `<img src="${connectionInfo.image}" alt="${connectionInfo.description}"
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                         <div class="no-image" style="display: none;">
                            <div style="font-size: 48px; margin-bottom: 10px;">🔌</div>
                            <div>Схема подключения для ${blockType}</div>
                            <div style="margin-top: 10px; font-size: 11px; color: #999;">
                                Изображение будет добавлено в следующем обновлении
                            </div>
                         </div>` :
                        `<div class="no-image">
                            <div style="font-size: 48px; margin-bottom: 10px;">🔌</div>
                            <div>Схема подключения для ${blockType}</div>
                         </div>`
                    }
                </div>
                <div class="hint-info">
                    <p style="margin: 0 0 10px 0; font-weight: 500;">${connectionInfo.description}</p>
                    ${connectionInfo.pins ? `
                        <div class="pin-mapping">
                            <strong style="display: block; margin-bottom: 5px; font-size: 12px;">Распиновка:</strong>
                            ${connectionInfo.pins.map(pin =>
                                `<div class="pin-item">${pin}</div>`
                            ).join('')}
                        </div>
                    ` : ''}
                    <div style="margin-top: 10px; font-size: 11px; color: #666;">
                        Контроллер: <strong>${this.getBoardName(board)}</strong>
                    </div>
                </div>
            </div>
        `;

        // Позиционируем подсказку
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const hintWidth = 300;
        const hintHeight = hint.offsetHeight;

        let left = x + 15;
        let top = y + 15;

        // Проверяем, чтобы подсказка не выходила за границы экрана
        if (left + hintWidth > viewportWidth) {
            left = x - hintWidth - 15;
        }
        if (top + hintHeight > viewportHeight) {
            top = y - hintHeight - 15;
        }

        hint.style.left = left + 'px';
        hint.style.top = top + 'px';
        hint.style.display = 'block';

        // Добавляем анимацию появления
        hint.style.opacity = '0';
        hint.style.transform = 'scale(0.9)';

        setTimeout(() => {
            hint.style.transition = 'all 0.2s ease';
            hint.style.opacity = '1';
            hint.style.transform = 'scale(1)';
        }, 10);
    }

    static hideConnectionHint() {
        const hint = document.getElementById('connectionHint');
        if (hint) {
            hint.style.opacity = '0';
            hint.style.transform = 'scale(0.9)';
            setTimeout(() => {
                hint.style.display = 'none';
            }, 200);
        }
    }

    static getBoardName(boardType) {
        const names = {
            'uno': 'Arduino Uno',
            'nano': 'Arduino Nano',
            'mega': 'Arduino Mega',
            'zero': 'КонтрБаг ZERO'
        };
        return names[boardType] || boardType;
    }

    // Метод для добавления информации о подключении программно
    static addConnectionInfo(blockType, board, info) {
        if (!this.connectionMap[blockType]) {
            this.connectionMap[blockType] = {};
        }
        this.connectionMap[blockType][board] = info;
    }

    // Метод для получения всей информации о подключениях
    static getConnectionMap() {
        return this.connectionMap;
    }
}

// Регистрируем класс в глобальной области видимости
window.ConnectionHelper = ConnectionHelper;