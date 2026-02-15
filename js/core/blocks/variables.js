// Блоки для переменных

Blockly.Blocks['variables_declare'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Объявить переменную", "Declare variable"))
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("целое", "int"), "int"],
                [getBlockText("дробное", "float"), "float"],
                [getBlockText("логическое", "bool"), "bool"],
                [getBlockText("строка", "String"), "String"]
            ]), "TYPE")
            .appendField(new Blockly.FieldTextInput("переменная"), "VAR");
        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField("=");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Объявить переменную", "Declare variable"));
        this.setFieldValue(this.validateVarName(this.getFieldValue('VAR')), 'VAR');
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

Blockly.Blocks['variables_set'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Изменить значение переменной", "Set variable value"))
            .appendField(new Blockly.FieldTextInput("элемент"), "VAR");
        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField(getBlockText("в", "to"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Изменить значение переменной", "Set variable value"));
        this.setFieldValue(this.validateVarName(this.getFieldValue('VAR')), 'VAR');
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

Blockly.Blocks['variables_get'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Значение переменной", "Get"))
            .appendField(new Blockly.FieldTextInput("элемент"), "VAR");
        this.setOutput(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Получить значение переменной", "Get variable value"));
        this.setFieldValue(this.validateVarName(this.getFieldValue('VAR')), 'VAR');
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

Blockly.Blocks['variables_set_dropdown'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Установить", "✏️ Set"))
            .appendField(new Blockly.FieldTextInput("элемент"), "VAR");
        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField(getBlockText("в", "to"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Установить значение переменной", "Set variable value"));
        this.setFieldValue(this.validateVarName(this.getFieldValue('VAR')), 'VAR');
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
