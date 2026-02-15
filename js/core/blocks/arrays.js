// === БЛОКИ ДЛЯ РАБОТЫ С МАССИВАМИ ===

// Динамический блок создания массива
Blockly.Blocks['array_create'] = {
    init: function() {
        this.appendDummyInput('HEADER')
            .appendField("Создать массив")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME")
            .appendField("тип")
            .appendField(new Blockly.FieldDropdown([
                ["int", "int"],
                ["float", "float"],
                ["bool", "bool"],
                ["String", "String"],
                ["char", "char"]
            ], this.updateInputsVisibility.bind(this)), "TYPE")  // Добавляем обработчик изменения типа
            .appendField("размер")
            .appendField(new Blockly.FieldNumber(5, 1, 20, 1, null, null, this.updateInputsVisibility.bind(this)), "SIZE");

        this.appendDummyInput('VALUES_HEADER')
            .appendField("начальные значения:");

        // Максимальное количество элементов
        this.maxElements = 20;

        // Создаем все входы заранее, но управляем их видимостью
        this.createAllInputs();

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setInputsInline(true);
        this.setTooltip("Создать массив с указанным типом и размером");
        this.setHelpUrl("");

        // Сохраняем и восстанавливаем состояние
        this.saveExtraState = this.saveExtraState.bind(this);
        this.loadExtraState = this.loadExtraState.bind(this);

        this.defaultBlocksAttached = false;
    },

    createAllInputs: function() {
        // Создаем максимальное количество входов, но скрываем лишние
        for (let i = 0; i < this.maxElements; i++) {
            const valueInput = this.appendValueInput(`VALUE_${i}`)
                .setCheck(null)
                .appendField(`[${i}]`);

            // Скрываем все входы, кроме первых 5
            valueInput.setVisible(i < 5);
        }
    },

    updateInputsVisibility: function() {
        const size = parseInt(this.getFieldValue('SIZE')) || 5;
        const type = this.getFieldValue('TYPE');

        // Обновляем видимость входов
        for (let i = 0; i < this.maxElements; i++) {
            const input = this.getInput(`VALUE_${i}`);
            if (input) {
                input.setVisible(i < size);
            }
        }

        // Обновляем подписи (опционально)
        this.updateFieldLabels();

        // Обновляем размер блока
        if (this.workspace && this.rendered) {
            setTimeout(() => {
                this.workspace.resize();
            }, 10);
        }
    },

    updateFieldLabels: function() {
        // Можно обновить подписи полей, если нужно
        const size = parseInt(this.getFieldValue('SIZE')) || 5;

        for (let i = 0; i < Math.min(size, this.maxElements); i++) {
            const input = this.getInput(`VALUE_${i}`);
            if (input && input.fieldRow && input.fieldRow[0]) {
                input.fieldRow[0].setValue(`[${i}]`);
            }
        }
    },

    // Сохранение состояния для копирования
    saveExtraState: function() {
        const size = parseInt(this.getFieldValue('SIZE')) || 5;
        const type = this.getFieldValue('TYPE');
        const name = this.getFieldValue('NAME');

        // Сохраняем информацию о подключенных блоках
        const connectedValues = {};
        for (let i = 0; i < size; i++) {
            const input = this.getInput(`VALUE_${i}`);
            if (input && input.connection && input.connection.targetBlock()) {
                connectedValues[i] = true;
            }
        }

        return {
            size: size,
            type: type,
            name: name,
            connectedValues: connectedValues
        };
    },

    // Восстановление состояния при вставке
    loadExtraState: function(state) {
        if (state) {
            // Устанавливаем сохраненные значения полей
            if (state.name !== undefined) {
                const nameField = this.getField('NAME');
                if (nameField) {
                    nameField.setValue(state.name);
                }
            }

            if (state.type !== undefined) {
                const typeField = this.getField('TYPE');
                if (typeField) {
                    typeField.setValue(state.type);
                }
            }

            if (state.size !== undefined) {
                const sizeField = this.getField('SIZE');
                if (sizeField) {
                    sizeField.setValue(state.size);
                    // Обновляем видимость входов
                    this.updateInputsVisibility();
                }
            }

            // Восстанавливаем подключенные блоки (Blockly сделает это автоматически)
        }
    },

    // Обработчик изменения блока
    onchange: function(event) {
        // При первом добавлении в рабочую область
        if (this.workspace && !this.defaultBlocksAttached) {
            setTimeout(() => {
                this.attachDefaultBlocks();
                this.defaultBlocksAttached = true;
            }, 100);
        }

        // Валидация имени переменной
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }

        // Обновление видимости при изменении размера или типа
        this.updateInputsVisibility();
    },

    attachDefaultBlocks: function() {
        if (!this.workspace) return;

        const size = parseInt(this.getFieldValue('SIZE')) || 5;
        const type = this.getFieldValue('TYPE');

        for (let i = 0; i < size; i++) {
            const input = this.getInput(`VALUE_${i}`);
            if (input && input.connection && !input.connection.targetBlock()) {
                try {
                    const block = this.createDefaultBlock(type, i);
                    if (block) {
                        input.connection.connect(block.outputConnection);
                    }
                } catch(e) {
                    console.warn('Failed to attach default block:', e);
                }
            }
        }
    },

    createDefaultBlock: function(type, index) {
        let block = null;

        switch(type) {
            case 'int':
                block = this.workspace.newBlock('math_number');
                block.setFieldValue('0', 'NUM');
                break;
            case 'float':
                block = this.workspace.newBlock('math_number');
                block.setFieldValue('0.0', 'NUM');
                break;
            case 'bool':
                block = this.workspace.newBlock('logic_boolean');
                block.setFieldValue('FALSE', 'BOOL');
                break;
            case 'String':
                block = this.workspace.newBlock('text');
                block.setFieldValue('', 'TEXT');
                break;
            case 'char':
                block = this.workspace.newBlock('text');
                block.setFieldValue('A', 'TEXT');
                break;
        }

        if (block) {
            block.setShadow(true);
            block.initSvg();
            block.render();
        }

        return block;
    },

    validateVarName: function(name) {
        if (!name) return 'arr';
        let cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(cleaned)) cleaned = '_' + cleaned;
        if (!cleaned || cleaned === '_') cleaned = 'arr';
        return cleaned;
    }
};


// Блок массива с выходом (для выражений)
Blockly.Blocks['array_output'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("Массив")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.setOutput(true, "Array");
        this.setColour(330);
        this.setTooltip("Ссылка на массив (можно использовать в выражениях)");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        if (!name) return 'arr';
        let cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(cleaned)) cleaned = '_' + cleaned;
        if (!cleaned || cleaned === '_') cleaned = 'arr';
        return cleaned;
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};


// Установка элемента массива
Blockly.Blocks['array_set'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("Установить элемент массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.appendValueInput("INDEX")
            .setCheck("Number")
            .appendField("индекс");

        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField("значение");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Установить значение элемента массива по индексу");
        this.setHelpUrl("");
        this.setInputsInline(true);
        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        if (!name) return 'arr';
        let cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(cleaned)) cleaned = '_' + cleaned;
        if (!cleaned || cleaned === '_') cleaned = 'arr';
        return cleaned;
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Получение элемента массива
Blockly.Blocks['array_get'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("Получить элемент массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.appendValueInput("INDEX")
            .setCheck("Number")
            .appendField("с индексом");

        this.setOutput(true, null);
        this.setColour(330);
        this.setTooltip("Получить значение элемента массива по индексу");
        this.setHelpUrl("");
        this.setInputsInline(true);
        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Длина массива
Blockly.Blocks['array_length'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Длина массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip("Получить длину (размер) массива");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Поиск в массиве
Blockly.Blocks['array_find'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Найти в массиве")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField("значение");

        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip("Найти индекс первого вхождения значения в массиве. Возвращает -1 если не найдено.");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Заполнение массива
Blockly.Blocks['array_fill'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Заполнить массив")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField("значением");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Заполнить весь массив указанным значением");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Копирование массива
Blockly.Blocks['array_copy'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Копировать массив")
            .appendField("из")
            .appendField(new Blockly.FieldTextInput("source"), "SOURCE")
            .appendField("в")
            .appendField(new Blockly.FieldTextInput("dest"), "DEST");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Копировать содержимое одного массива в другой");
        this.setHelpUrl("");

        this.validateVarNames();
    },

    validateVarNames: function() {
        const sourceField = this.getField('SOURCE');
        const destField = this.getField('DEST');

        if (sourceField) {
            const currentValue = sourceField.getValue();
            const validatedValue = currentValue.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'SOURCE');
            }
        }

        if (destField) {
            const currentValue = destField.getValue();
            const validatedValue = currentValue.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'DEST');
            }
        }
    },

    onchange: function() {
        this.validateVarNames();
    }
};

// Сортировка массива
Blockly.Blocks['array_sort'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Сортировать массив")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME")
            .appendField(new Blockly.FieldDropdown([
                ["по возрастанию", "ASC"],
                ["по убыванию", "DESC"]
            ]), "ORDER");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Отсортировать массив по возрастанию или убыванию");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Сумма элементов массива
Blockly.Blocks['array_sum'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Сумма элементов массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip("Вычислить сумму всех элементов числового массива");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Среднее значение массива
Blockly.Blocks['array_average'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Среднее значение массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip("Вычислить среднее арифметическое элементов массива");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Минимальный элемент массива
Blockly.Blocks['array_min'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Минимальный элемент массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip("Найти минимальный элемент в массиве");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Максимальный элемент массива
Blockly.Blocks['array_max'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Максимальный элемент массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip("Найти максимальный элемент в массиве");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Создание массива из строки
Blockly.Blocks['array_from_string'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Массив из строки")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME")
            .appendField("разделитель")
            .appendField(new Blockly.FieldTextInput(","), "DELIMITER");

        this.appendValueInput("STRING")
            .setCheck("String")
            .appendField("строка");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Создать массив строк, разделив входную строку по указанному разделителю");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Объединение массива в строку
Blockly.Blocks['array_join'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Объединить массив в строку")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME")
            .appendField("разделитель")
            .appendField(new Blockly.FieldTextInput(", "), "DELIMITER");

        this.setOutput(true, "String");
        this.setColour(330);
        this.setTooltip("Объединить элементы массива в одну строку с указанным разделителем");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Реверс массива
Blockly.Blocks['array_reverse'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Перевернуть массив")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Развернуть порядок элементов массива в обратном порядке");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('NAME'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('NAME');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }
    }
};

// Срез массива (подмассив)
Blockly.Blocks['array_slice'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Срез массива")
            .appendField(new Blockly.FieldTextInput("arr"), "NAME")
            .appendField("от")
            .appendField(new Blockly.FieldNumber(0, 0, 100), "START")
            .appendField("до")
            .appendField(new Blockly.FieldNumber(5, 0, 100), "END");

        this.appendDummyInput()
            .appendField("сохранить в")
            .appendField(new Blockly.FieldTextInput("result"), "RESULT");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Создать новый массив из среза исходного массива от START до END (не включая END)");
        this.setHelpUrl("");

        this.validateVarNames();
    },

    validateVarNames: function() {
        const nameField = this.getField('NAME');
        const resultField = this.getField('RESULT');

        if (nameField) {
            const currentValue = nameField.getValue();
            const validatedValue = currentValue.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'NAME');
            }
        }

        if (resultField) {
            const currentValue = resultField.getValue();
            const validatedValue = currentValue.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'RESULT');
            }
        }
    },

    onchange: function() {
        this.validateVarNames();
    }
};

// Объявление массива как глобальной переменной (для backward compatibility)
Blockly.Blocks['variables_declare_array'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📊 Объявить массив")
            .appendField(new Blockly.FieldTextInput("arr"), "VAR")
            .appendField("тип")
            .appendField(new Blockly.FieldDropdown([
                ["int", "int"],
                ["float", "float"],
                ["bool", "bool"],
                ["String", "String"]
            ]), "TYPE")
            .appendField("размер")
            .appendField(new Blockly.FieldNumber(10, 1, 100), "SIZE");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip("Объявить массив как глобальную переменную");
        this.setHelpUrl("");

        this.validateVarName(this.getFieldValue('VAR'));
    },

    validateVarName: function(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
    },

    onchange: function() {
        const varField = this.getField('VAR');
        if (varField) {
            const currentValue = varField.getValue();
            const validatedValue = this.validateVarName(currentValue);
            if (currentValue !== validatedValue) {
                this.setFieldValue(validatedValue, 'VAR');
            }
        }
    }
};

Blockly.Blocks['array_literal'] = {
    init: function() {
        this.appendDummyInput('START')
            .appendField("[");

        // Начинаем с 2 элементов
        this.valueCount = 2;
        this.maxElements = 10; // Максимум 10 элементов

        // Создаем начальные входы
        this.createInitialInputs();

        this.appendDummyInput('END')
            .appendField("]");

        this.setOutput(true, null);
        this.setColour(330);
        this.setTooltip("Создать литерал массива. Новые элементы добавляются автоматически при заполнении последнего.");
        this.setHelpUrl("");

        this.lastCheckTime = 0;

        // Сохраняем состояние при копировании
        this.saveExtraState = this.saveExtraState.bind(this);
        this.loadExtraState = this.loadExtraState.bind(this);
    },

    createInitialInputs: function() {
        // Создаем начальные 2 элемента
        for (let i = 0; i < this.valueCount; i++) {
            this.appendValueInput(`VALUE_${i}`)
                .setCheck(null);

            // Добавляем запятую между элементами (кроме последнего)
            if (i < this.valueCount - 1) {
                this.appendDummyInput(`COMMA_${i}`)
                    .appendField(",");
            }
        }
    },

    // Сохранение состояния для копирования
    saveExtraState: function() {
        return {
            valueCount: this.valueCount,
            // Сохраняем информацию о подключенных блоках
            connections: this.saveConnections()
        };
    },

    // Восстановление состояния при вставке
    loadExtraState: function(state) {
        if (state && state.valueCount) {
            // Восстанавливаем структуру блока
            this.rebuildFromState(state.valueCount);

            // Восстанавливаем подключения
            if (state.connections) {
                setTimeout(() => {
                    this.loadConnections(state.connections);
                }, 10);
            }
        }
    },

    saveConnections: function() {
        const connections = {};
        for (let i = 0; i < this.valueCount; i++) {
            const input = this.getInput(`VALUE_${i}`);
            if (input && input.connection && input.connection.targetBlock()) {
                // Сохраняем только информацию о том, что блок подключен
                // Фактическое восстановление произойдет через стандартные механизмы Blockly
                connections[`VALUE_${i}`] = true;
            }
        }
        return connections;
    },

    loadConnections: function(connections) {
        // Blockly сам восстановит подключения через стандартные механизмы
        // Этот метод нужен для совместимости
    },

    // Перестроение блока из сохраненного состояния
    rebuildFromState: function(savedValueCount) {
        // Если сохраненное состояние отличается от текущего
        if (savedValueCount && savedValueCount !== this.valueCount) {
            // Удаляем все старые входы (кроме START и END)
            this.removeOldInputs();

            // Устанавливаем новое количество элементов
            this.valueCount = Math.min(savedValueCount, this.maxElements);

            // Создаем новые входы
            this.createInputs();

            // Перемещаем END в конец
            this.moveInputBefore('END', null);

            // Обновляем отображение
            if (this.workspace && this.rendered) {
                setTimeout(() => {
                    this.workspace.resize();
                }, 10);
            }
        }
    },

    removeOldInputs: function() {
        // Удаляем все входы, кроме START и END
        const inputsToRemove = [];

        for (let i = 0; i < this.inputList.length; i++) {
            const input = this.inputList[i];
            if (input.name !== 'START' && input.name !== 'END') {
                inputsToRemove.push(input.name);
            }
        }

        // Удаляем в обратном порядке, чтобы не сломать индексы
        for (let i = inputsToRemove.length - 1; i >= 0; i--) {
            this.removeInput(inputsToRemove[i]);
        }
    },

    createInputs: function() {
        // Создаем необходимое количество входов
        for (let i = 0; i < this.valueCount; i++) {
            this.appendValueInput(`VALUE_${i}`)
                .setCheck(null);

            // Добавляем запятую между элементами (кроме последнего)
            if (i < this.valueCount - 1) {
                this.appendDummyInput(`COMMA_${i}`)
                    .appendField(",");
            }
        }
    },

    // Надежный метод для добавления нового элемента
    addElement: function() {
        if (this.valueCount >= this.maxElements) return null;

        const newIndex = this.valueCount;

        // Добавляем запятую перед новым элементом (если это не первый элемент)
        if (newIndex > 0) {
            this.appendDummyInput(`COMMA_${newIndex - 1}`)
                .appendField(",");
        }

        // Добавляем новый вход для значения
        const newInput = this.appendValueInput(`VALUE_${newIndex}`)
            .setCheck(null);

        // Перемещаем END в конец
        this.moveInputBefore('END', null);

        this.valueCount++;

        // Обновляем отображение
        if (this.workspace && this.rendered) {
            setTimeout(() => {
                this.workspace.resize();
            }, 10);
        }

        return newInput;
    },

    // Надежный метод для удаления последнего элемента
    removeLastElement: function() {
        if (this.valueCount <= 2) return;

        const lastIndex = this.valueCount - 1;

        // Удаляем последний элемент
        const valueInputName = `VALUE_${lastIndex}`;
        if (this.getInput(valueInputName)) {
            this.removeInput(valueInputName);
        }

        // Удаляем запятую перед последним элементом (если есть)
        const commaInputName = `COMMA_${lastIndex - 1}`;
        if (this.getInput(commaInputName)) {
            this.removeInput(commaInputName);
        }

        this.valueCount--;

        // Обновляем отображение
        if (this.workspace && this.rendered) {
            setTimeout(() => {
                this.workspace.resize();
            }, 10);
        }
    },

    onchange: function(event) {
        // Защита от слишком частых проверок
        const now = Date.now();
        if (now - this.lastCheckTime < 300) return;
        this.lastCheckTime = now;

        // Проверяем состояние через небольшой таймаут
        setTimeout(() => {
            if (this.workspace && !this.isDisposed()) {
                this.checkInputs();
            }
        }, 100);
    },

    checkInputs: function() {
        if (!this.workspace) return;

        try {
            // Проверяем заполненность последнего элемента
            const lastIndex = this.valueCount - 1;
            const lastInput = this.getInput(`VALUE_${lastIndex}`);

            if (lastInput && lastInput.connection) {
                const isFilled = lastInput.connection.targetBlock();

                if (isFilled) {
                    // Если последний элемент заполнен и есть место, добавляем новый
                    if (this.valueCount < this.maxElements) {
                        this.addElement();
                    }
                } else {
                    // Если последний элемент пустой
                    if (this.valueCount > 2) {
                        // Проверяем предпоследний элемент
                        const prevIndex = lastIndex - 1;
                        const prevInput = this.getInput(`VALUE_${prevIndex}`);

                        let prevFilled = false;
                        if (prevInput && prevInput.connection) {
                            prevFilled = prevInput.connection.targetBlock();
                        }

                        // Если предпоследний тоже пустой, удаляем последний
                        if (!prevFilled) {
                            this.removeLastElement();
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Error in checkInputs:', error);
        }
    },

    // Для отладки
    // decompose: function(workspace) {
    //     console.log('Decompose called');
    //     return null;
    // },

    // compose: function(containerBlock) {
    //     console.log('Compose called');
    // },

    // saveConnections: function(containerBlock) {
    //     console.log('Save connections called');
    // },

    // loadConnections: function(containerBlock) {
    //     console.log('Load connections called');
    // }
};