class BlocklyManager {
    static initializeBlockly() {
        try {
            // Проверяем, не инициализирован ли Blockly уже
            if (window.blocklyWorkspace) {
                console.log('Blockly уже инициализирован');
                return window.blocklyWorkspace;
            }

            // Настраиваем Blockly чтобы избежать конфликтов
            if (Blockly.Extensions) {
                // Отключаем конфликтующие расширения
                Blockly.Extensions.unregister('contextMenu_variableDynamicSetterGetter');
            }

            const workspace = Blockly.inject('blocklyDiv', {
                toolbox: document.getElementById('toolbox'),
                collapse: true,
                comments: false, // Отключаем комментарии чтобы избежать конфликтов
                disable: false,
                maxBlocks: Infinity,
                trashcan: true,
                horizontalLayout: false,
                toolboxPosition: 'start',
                css: true,
                media: 'https://cdn.jsdelivr.net/npm/blockly@9.2.0/media/',
                zoom: {
                    controls: true,
                    wheel: true,
                    startScale: 1.0,
                    maxScale: 3,
                    minScale: 0.3,
                    scaleSpeed: 1.2
                },
                grid: {
                    spacing: 20,
                    length: 3,
                    colour: 'var(--blockly-grid)',
                    snap: true
                },
                renderer: 'geras', // Используем стабильный рендерер
                move: {
                    scrollbars: true,
                    drag: true,
                    wheel: true
                }
            });

            // Убираем точки с заднего фона
            this.removeGridDots();

            // Сохраняем workspace в глобальной переменной
            window.blocklyWorkspace = workspace;

            console.log('Blockly успешно инициализирован');
            return workspace;
        } catch (error) {
            console.error('Ошибка инициализации Blockly:', error);

            // Показываем пользователю сообщение об ошибке
            if (window.UIManager) {
                window.UIManager.showNotification('Ошибка инициализации Blockly: ' + error.message, true);
            }

            throw error;
        }
    }

    static removeGridDots() {
        setTimeout(() => {
            const gridPattern = document.querySelector('pattern[id*="blocklyGridPattern"]');
            if (gridPattern) {
                const circles = gridPattern.querySelectorAll('circle');
                circles.forEach(circle => circle.remove());
            }
        }, 100);
    }

    static applyTheme() {
        // Будет обновляться через CSS переменные
    }
}

// Регистрируем класс в глобальной области видимости
window.BlocklyManager = BlocklyManager;