// === БЛОК ОПРЕДЕЛЕНИЯ ФУНКЦИИ (БЕЗ ИЗМЕНЕНИЙ) ===

Blockly.Blocks['function_definition'] = {
    init: function() {
        this.appendDummyInput("HEADER")
            .appendField(getBlockText("Функция", "Function"))
            .appendField(new Blockly.FieldDropdown([
                ["void", "void"],
                ["int", "int"],
                ["float", "float"],
                ["bool", "bool"],
                ["String", "String"]
            ]), "RETURN_TYPE")
            .appendField(new Blockly.FieldTextInput("myFunction", function(newValue) {
                return newValue.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_');
            }), "NAME");

        this.paramNames_ = [];
        this.paramTypes_ = [];

        this.appendDummyInput("PARAMS_CONTAINER");
        this.updateParamsDisplay();

        this.appendStatementInput("CODE")
            .appendField(getBlockText("код", "code"));

        this.setColour(290);
        this.setTooltip(getBlockText("Создать функцию с параметрами", "Create function with parameters"));

        this.setMutator(new Blockly.icons.MutatorIcon(['function_param'], this));
    },

    updateParamsDisplay: function() {
        const paramsInput = this.getInput("PARAMS_CONTAINER");
        if (!paramsInput) return;

        // Очищаем контейнер
        while (paramsInput.fieldRow.length > 0) {
            paramsInput.removeField(paramsInput.fieldRow[0].name);
        }

        // Добавляем параметры
        paramsInput.appendField("(", "OPEN_PAREN");

        for (let i = 0; i < this.paramNames_.length; i++) {
            if (i > 0) {
                paramsInput.appendField(", ", "COMMA_" + i);
            }

            const paramText = this.paramTypes_[i] + " " + this.paramNames_[i];
            paramsInput.appendField(new Blockly.FieldLabel(paramText), "PARAM_" + i);
        }

        paramsInput.appendField(")", "CLOSE_PAREN");

        if (this.rendered) {
            this.render();
        }
    },

    mutationToDom: function() {
        const container = Blockly.utils.xml.createElement('mutation');
        for (let i = 0; i < this.paramNames_.length; i++) {
            const arg = Blockly.utils.xml.createElement('arg');
            arg.setAttribute('name', this.paramNames_[i]);
            arg.setAttribute('type', this.paramTypes_[i]);
            container.appendChild(arg);
        }
        return container;
    },

    domToMutation: function(xmlElement) {
        this.paramNames_ = [];
        this.paramTypes_ = [];

        for (let i = 0; i < xmlElement.childNodes.length; i++) {
            const node = xmlElement.childNodes[i];
            if (node.nodeName.toLowerCase() === 'arg') {
                this.paramNames_.push(node.getAttribute('name') || 'param' + (i + 1));
                this.paramTypes_.push(node.getAttribute('type') || 'int');
            }
        }

        this.updateParamsDisplay();
    },

    decompose: function(workspace) {
        const containerBlock = workspace.newBlock('function_container');
        containerBlock.initSvg();

        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.paramNames_.length; i++) {
            const paramBlock = workspace.newBlock('function_param');
            paramBlock.initSvg();
            paramBlock.setFieldValue(this.paramTypes_[i], 'TYPE');
            paramBlock.setFieldValue(this.paramNames_[i], 'NAME');
            connection.connect(paramBlock.previousConnection);
            connection = paramBlock.nextConnection;
        }

        return containerBlock;
    },

    compose: function(containerBlock) {
        this.paramNames_ = [];
        this.paramTypes_ = [];

        let paramBlock = containerBlock.getInputTargetBlock('STACK');
        while (paramBlock && paramBlock.type === 'function_param') {
            const type = paramBlock.getFieldValue('TYPE');
            const name = paramBlock.getFieldValue('NAME');

            if (name && name.trim() !== '') {
                this.paramTypes_.push(type);
                this.paramNames_.push(name);
            }

            paramBlock = paramBlock.nextConnection && paramBlock.nextConnection.targetBlock();
        }

        this.updateParamsDisplay();
        this.updateFunctionCalls();
    },

    // Метод для обновления всех вызовов этой функции
    updateFunctionCalls: function() {
        const funcName = this.getFieldValue('NAME');
        if (!funcName) return;

        const workspace = this.workspace;
        if (!workspace) return;

        const allBlocks = workspace.getAllBlocks(false);

        for (let i = 0; i < allBlocks.length; i++) {
            const block = allBlocks[i];
            if ((block.type === 'function_call' || block.type === 'function_call_no_return') &&
                block.getFieldValue('NAME') === funcName) {

                if (typeof block.updateFunctionArgs === 'function') {
                    block.updateFunctionArgs(funcName);
                }
            }
        }
    },

    // Обработчик изменений
    onchange: function(event) {
        // При изменении имени функции обновляем все вызовы
        if (event && event.type === Blockly.Events.BLOCK_CHANGE &&
            event.element === 'field' && event.name === 'NAME') {

            setTimeout(() => {
                this.updateFunctionCalls();
            }, 100);
        }
    },

    saveExtraState: function() {
        return {
            paramNames: this.paramNames_,
            paramTypes: this.paramTypes_,
            returnType: this.getFieldValue('RETURN_TYPE')
        };
    },

    loadExtraState: function(state) {
        if (state) {
            this.paramNames_ = state.paramNames || [];
            this.paramTypes_ = state.paramTypes || [];

            if (this.paramTypes_.length === 0 && this.paramNames_.length > 0) {
                this.paramTypes_ = new Array(this.paramNames_.length).fill('int');
            }

            if (state.returnType) {
                const dropdown = this.getField('RETURN_TYPE');
                if (dropdown) {
                    dropdown.setValue(state.returnType);
                }
            }

            this.updateParamsDisplay();
        }
    }
};

// === БЛОК ВЫЗОВА ФУНКЦИИ С ВОЗВРАТОМ (УПРОЩЕННЫЙ) ===

Blockly.Blocks['function_call'] = {
    init: function() {
        this.appendDummyInput("MAIN")
            .appendField(getBlockText("Результат функции", "Call Function"))
            .appendField(new Blockly.FieldDropdown([["", ""]]), "NAME");

        // 5 фиксированных входов для аргументов
        for (let i = 0; i < 10; i++) {
            this.appendValueInput('ARG_' + i)
                .setCheck(null)
                .appendField("arg" + i + ":")
                .setVisible(false);
        }

        this.setOutput(true, null);
        this.setColour(290);
        this.setTooltip(getBlockText("Вызвать функцию с аргументами", "Call function with arguments"));

        // Сохраняем текущее значение функции
        this.currentFunctionName_ = "";
        this.isUpdating_ = false;

        // Обработчик изменения значения
        const dropdown = this.getField('NAME');
        const self = this;
        dropdown.setValidator(function(newValue) {
            if (!self.isUpdating_) {
                self.currentFunctionName_ = newValue;
                setTimeout(() => {
                    self.updateFunctionArgs(newValue);
                }, 10);
            }
            return newValue;
        });
        this.updateFunctionList();
    },

    updateFunctionArgs: function(funcName) {
        if (this.isUpdating_) return;
        this.isUpdating_ = true;

        try {
            if (!funcName) {
                for (let i = 0; i < 10; i++) {
                    const input = this.getInput('ARG_' + i);
                    if (input) input.setVisible(false);
                }
                return;
            }

            const workspace = this.workspace || Blockly.getMainWorkspace();
            if (!workspace) return;

            // Ищем функцию
            let funcBlock = null;
            const allBlocks = workspace.getAllBlocks(false);
            for (let i = 0; i < allBlocks.length; i++) {
                const block = allBlocks[i];
                if (block.type === 'function_definition' &&
                    block.getFieldValue('NAME') === funcName) {
                    funcBlock = block;
                    break;
                }
            }

            if (!funcBlock) {
                for (let i = 0; i < 10; i++) {
                    const input = this.getInput('ARG_' + i);
                    if (input) input.setVisible(false);
                }
                return;
            }

            const paramNames = funcBlock.paramNames_ || [];
            const paramTypes = funcBlock.paramTypes_ || [];

            for (let i = 0; i < 10; i++) {
                const input = this.getInput('ARG_' + i);
                if (input) {
                    if (i < paramNames.length) {
                        // Обновляем подпись
                        while (input.fieldRow.length > 0) {
                            input.removeField(input.fieldRow[0].name);
                        }
                        input.appendField(paramNames[i] + " (" + paramTypes[i] + "):", "LABEL_" + i);
                        input.setCheck(this.getCheckType(paramTypes[i]));
                        input.setVisible(true);
                    } else {
                        input.setVisible(false);
                    }
                }
            }

            if (this.rendered) this.render();
        } finally {
            this.isUpdating_ = false;
        }
    },

    getCheckType: function(paramType) {
        switch(paramType) {
            case 'int': case 'float': return 'Number';
            case 'bool': return 'Boolean';
            case 'String': return 'String';
            default: return null;
        }
    },

    // Обновляем список функций
    updateFunctionList: function() {
        if (this.isUpdating_) return;
        this.isUpdating_ = true;

        try {
            const dropdown = this.getField('NAME');
            if (!dropdown) return;

            const workspace = this.workspace || Blockly.getMainWorkspace();
            if (!workspace) return;

            const currentValue = this.currentFunctionName_ || dropdown.getValue();
            const options = [["", ""]];
            const allBlocks = workspace.getAllBlocks(false);

            for (let i = 0; i < allBlocks.length; i++) {
                const block = allBlocks[i];
                if (block.type === 'function_definition') {
                    const funcName = block.getFieldValue('NAME');
                    const returnType = block.getFieldValue('RETURN_TYPE');
                    if (funcName && funcName.trim() !== '' && returnType !== 'void') {
                        options.push([funcName + " (" + returnType + ")", funcName]);
                    }
                }
            }

            // Сохраняем текущее значение если оно есть в списке
            let valueToSet = "";
            if (currentValue && options.some(opt => opt[1] === currentValue)) {
                valueToSet = currentValue;
            } else if (this.savedFunctionName_ && options.some(opt => opt[1] === this.savedFunctionName_)) {
                valueToSet = this.savedFunctionName_;
                this.savedFunctionName_ = null;
            }

            // Обновляем опции
            dropdown.setOptions(options);

            // Устанавливаем значение
            if (valueToSet) {
                dropdown.setValue(valueToSet);
                this.currentFunctionName_ = valueToSet;
                this.updateFunctionArgs(valueToSet);
            }
        } finally {
            this.isUpdating_ = false;
        }
    },

    saveExtraState: function() {
        return {
            functionName: this.currentFunctionName_ || ""
        };
    },

    loadExtraState: function(state) {
        if (state && state.functionName && state.functionName.trim() !== '') {
            this.savedFunctionName_ = state.functionName;
            this.currentFunctionName_ = state.functionName;
        }
    },

    // Обновление при изменении workspace
    onchange: function(event) {
        // При изменениях в workspace обновляем список функций
        if (event && (event.type === Blockly.Events.BLOCK_CREATE ||
                      event.type === Blockly.Events.BLOCK_DELETE)) {

            const block = event.blockId ? this.workspace.getBlockById(event.blockId) : null;
            if (block && block.type === 'function_definition') {
                setTimeout(() => {
                    this.updateFunctionList();
                }, 50);
            }
        }
    }
};

// === БЛОК ВЫЗОВА ФУНКЦИИ БЕЗ ВОЗВРАТА (УПРОЩЕННЫЙ) ===

Blockly.Blocks['function_call_no_return'] = {
    init: function() {
        this.appendDummyInput("MAIN")
            .appendField(getBlockText("Выполнить функцию", "Call Function"))
            .appendField(new Blockly.FieldDropdown([["", ""]]), "NAME");

        // 5 фиксированных входов для аргументов
        for (let i = 0; i < 10; i++) {
            this.appendValueInput('ARG_' + i)
                .setCheck(null)
                .appendField("arg" + i + ":")
                .setVisible(false);
        }

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
        this.setTooltip(getBlockText("Вызвать функцию без возврата значения", "Call function without return"));

        // Сохраняем текущее значение функции
        this.currentFunctionName_ = "";
        this.isUpdating_ = false;

        // Обработчик изменения значения
        const dropdown = this.getField('NAME');
        const self = this;
        dropdown.setValidator(function(newValue) {
            if (!self.isUpdating_) {
                self.currentFunctionName_ = newValue;
                setTimeout(() => {
                    self.updateFunctionArgs(newValue);
                }, 10);
            }
            return newValue;
        });

        this.updateFunctionList();
    },

    updateFunctionArgs: function(funcName) {
        if (this.isUpdating_) return;
        this.isUpdating_ = true;

        try {
            if (!funcName) {
                for (let i = 0; i < 10; i++) {
                    const input = this.getInput('ARG_' + i);
                    if (input) input.setVisible(false);
                }
                return;
            }

            const workspace = this.workspace || Blockly.getMainWorkspace();
            if (!workspace) return;

            // Ищем функцию
            let funcBlock = null;
            const allBlocks = workspace.getAllBlocks(false);
            for (let i = 0; i < allBlocks.length; i++) {
                const block = allBlocks[i];
                if (block.type === 'function_definition' &&
                    block.getFieldValue('NAME') === funcName) {
                    funcBlock = block;
                    break;
                }
            }

            if (!funcBlock) {
                for (let i = 0; i < 10; i++) {
                    const input = this.getInput('ARG_' + i);
                    if (input) input.setVisible(false);
                }
                return;
            }

            const paramNames = funcBlock.paramNames_ || [];
            const paramTypes = funcBlock.paramTypes_ || [];

            for (let i = 0; i < 10; i++) {
                const input = this.getInput('ARG_' + i);
                if (input) {
                    if (i < paramNames.length) {
                        // Обновляем подпись
                        while (input.fieldRow.length > 0) {
                            input.removeField(input.fieldRow[0].name);
                        }
                        input.appendField(paramNames[i] + " (" + paramTypes[i] + "):", "LABEL_" + i);
                        input.setCheck(this.getCheckType(paramTypes[i]));
                        input.setVisible(true);
                    } else {
                        input.setVisible(false);
                    }
                }
            }

            if (this.rendered) this.render();
        } finally {
            this.isUpdating_ = false;
        }
    },

    getCheckType: function(paramType) {
        switch(paramType) {
            case 'int': case 'float': return 'Number';
            case 'bool': return 'Boolean';
            case 'String': return 'String';
            default: return null;
        }
    },

    // Обновляем список функций
    updateFunctionList: function() {
        if (this.isUpdating_) return;
        this.isUpdating_ = true;

        try {
            const dropdown = this.getField('NAME');
            if (!dropdown) return;

            const workspace = this.workspace || Blockly.getMainWorkspace();
            if (!workspace) return;

            const currentValue = this.currentFunctionName_ || dropdown.getValue();
            const options = [["", ""]];
            const allBlocks = workspace.getAllBlocks(false);

            for (let i = 0; i < allBlocks.length; i++) {
                const block = allBlocks[i];
                if (block.type === 'function_definition') {
                    const funcName = block.getFieldValue('NAME');
                    if (funcName && funcName.trim() !== '') {
                        const returnType = block.getFieldValue('RETURN_TYPE');
                        options.push([funcName + " (" + returnType + ")", funcName]);
                    }
                }
            }

            // Сохраняем текущее значение если оно есть в списке
            let valueToSet = "";
            if (currentValue && options.some(opt => opt[1] === currentValue)) {
                valueToSet = currentValue;
            } else if (this.savedFunctionName_ && options.some(opt => opt[1] === this.savedFunctionName_)) {
                valueToSet = this.savedFunctionName_;
                this.savedFunctionName_ = null;
            }

            // Обновляем опции
            dropdown.setOptions(options);

            // Устанавливаем значение
            if (valueToSet) {
                dropdown.setValue(valueToSet);
                this.currentFunctionName_ = valueToSet;
                this.updateFunctionArgs(valueToSet);
            }
        } finally {
            this.isUpdating_ = false;
        }
    },

    saveExtraState: function() {
        return {
            functionName: this.currentFunctionName_ || ""
        };
    },

    loadExtraState: function(state) {
        if (state && state.functionName && state.functionName.trim() !== '') {
            this.savedFunctionName_ = state.functionName;
            this.currentFunctionName_ = state.functionName;
        }
    },

    // Обновление при изменении workspace
    onchange: function(event) {
        // При изменениях в workspace обновляем список функций
        if (event && (event.type === Blockly.Events.BLOCK_CREATE ||
                      event.type === Blockly.Events.BLOCK_DELETE)) {

            const block = event.blockId ? this.workspace.getBlockById(event.blockId) : null;
            if (block && block.type === 'function_definition') {
                setTimeout(() => {
                    this.updateFunctionList();
                }, 50);
            }
        }
    }
};

// === ВСПОМОГАТЕЛЬНЫЕ БЛОКИ ===

Blockly.Blocks['function_container'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Параметры функции:", "Function Parameters:"));
        this.appendStatementInput('STACK');
        this.setColour(290);
        this.setTooltip(getBlockText("Добавьте параметры функции", "Add function parameters"));
        this.contextMenu = false;
        this.deletable = false;
        this.movable = false;
    }
};

Blockly.Blocks['function_param'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("тип", "type"))
            .appendField(new Blockly.FieldDropdown([
                ["int", "int"],
                ["float", "float"],
                ["bool", "bool"],
                ["String", "String"]
            ]), "TYPE")
            .appendField(getBlockText("имя", "name"))
            .appendField(new Blockly.FieldTextInput("param"), "NAME");

        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(290);
        this.setTooltip(getBlockText("Параметр функции", "Function parameter"));
        this.contextMenu = false;
    }
};

Blockly.Blocks['function_return'] = {
    init: function() {
        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField(getBlockText("вернуть", "return"));
        this.setPreviousStatement(true, null);
        this.setColour(290);
        this.setTooltip(getBlockText("Возвращает значение из функции", "Returns value from function"));
        this.setHelpUrl("");
    }
};

// === УПРОЩЕННАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ВЫЗОВОВ ===

window.updateAllFunctionCalls = function() {
    const workspace = Blockly.getMainWorkspace();
    if (!workspace) return;

    const allBlocks = workspace.getAllBlocks(false);

    // Просто обновляем списки функций в блоках вызова
    allBlocks.forEach(block => {
        if (block.type === 'function_call' || block.type === 'function_call_no_return') {
            if (typeof block.updateFunctionList === 'function') {
                setTimeout(() => {
                    block.updateFunctionList();
                }, 0);
            }
        }
    });
};

// Обработчик изменений для автоматического обновления
setTimeout(() => {
    if (window.workspace) {
        window.workspace.addChangeListener((event) => {
            if (event && (event.type === Blockly.Events.BLOCK_CHANGE ||
                          event.type === Blockly.Events.BLOCK_CREATE ||
                          event.type === Blockly.Events.BLOCK_DELETE)) {

                const block = event.blockId ? window.workspace.getBlockById(event.blockId) : null;
                if (block && block.type === 'function_definition') {
                    // При изменении функции обновляем ее вызовы
                    if (typeof block.updateFunctionCalls === 'function') {
                        setTimeout(() => {
                            block.updateFunctionCalls();
                        }, 100);
                    }

                    // Обновляем списки во всех вызовах
                    setTimeout(() => {
                        window.updateAllFunctionCalls();
                    }, 150);
                }
            }
        });
    }
}, 1000);