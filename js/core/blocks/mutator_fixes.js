// ФИКСЫ ДЛЯ МУТАТОРОВ БЛОКОВ

// Переопределяем создание редактора мутатора для правильной работы с flyout
(function() {
    // Сохраняем оригинальный метод
    var originalCreateEditor = Blockly.icons.MutatorIcon.prototype.createEditor_;

    Blockly.icons.MutatorIcon.prototype.createEditor_ = function() {
        // Вызываем оригинальный метод
        originalCreateEditor.call(this);

        // Если это мутатор функции, настраиваем flyout
        if (this.block_ && this.block_.type === 'function_definition') {
            setupFunctionMutatorFlyout(this);
        }
    };

    function setupFunctionMutatorFlyout(mutator) {
        if (!mutator.workspace_ || !mutator.workspace_.flyout) return;

        // Создаем блок параметра для flyout
        var xmlList = [
            {
                "kind": "block",
                "type": "function_param",
                "extraState": {
                    "fields": {
                        "TYPE": "int",
                        "NAME": "param"
                    }
                }
            }
        ];

        // Загружаем XML в flyout
        try {
            mutator.workspace_.flyout.show(xmlList);
        } catch (error) {
            console.error("Error setting up function mutator flyout:", error);
        }
    }

    // Инициализируем мутаторы для существующих блоков
    function initializeExistingMutators() {
        var workspace = Blockly.getMainWorkspace();
        if (!workspace) return;

        var blocks = workspace.getAllBlocks(false);
        blocks.forEach(function(block) {
            if (block.type === 'function_definition' && block.mutator) {
                // Перенастраиваем flyout для существующих мутаторов
                if (block.mutator.workspace_ && block.mutator.workspace_.flyout) {
                    setupFunctionMutatorFlyout(block.mutator);
                }
            }
        });
    }

    // Инициализируем после загрузки
    setTimeout(initializeExistingMutators, 2000);
})();

// Добавляем обработчики событий для работы мутаторов
document.addEventListener('DOMContentLoaded', function() {
    // Ждем инициализации Blockly
    setTimeout(function() {
        var workspace = Blockly.getMainWorkspace();
        if (workspace) {
            // Отслеживаем создание новых блоков
            workspace.addChangeListener(function(event) {
                if (event.type === Blockly.Events.BLOCK_CREATE) {
                    // Если создан блок функции, добавляем ему мутатор
                    var block = workspace.getBlockById(event.blockId);
                    if (block && block.type === 'function_definition') {
                        setTimeout(function() {
                            if (!block.mutator) {
                                var mutator = new Blockly.icons.MutatorIcon(['function_param'], block);
                                block.setMutator(mutator);
                            }
                        }, 100);
                    }
                }
            });
        }
    }, 3000);
});