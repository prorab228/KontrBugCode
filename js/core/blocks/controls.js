// Блоки управления (условия, циклы)

// Блок IF
Blockly.Blocks['controls_if'] = {
    init: function() {
        this.appendValueInput('CONDITION')
            .setCheck(['Boolean', 'Number'])
            .appendField(getBlockText('если', 'if'));
        this.appendStatementInput('THEN')
            .appendField(getBlockText('то', 'then'));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText('Начните с этого блока. К нему можно подключить else if и else.', 'Start with this block. You can connect else if and else to it.'));
    }
};

// Блок ELSE IF
Blockly.Blocks['controls_else_if'] = {
    init: function() {
        this.appendValueInput('CONDITION')
            .setCheck(['Boolean', 'Number'])
            .appendField(getBlockText('иначе если', 'else if'));
        this.appendStatementInput('THEN')
            .appendField(getBlockText('то', 'then'));
        this.setPreviousStatement(true, ['controls_if','controls_else_if']);
        this.setNextStatement(true, ['controls_else_if', 'controls_else']);
        this.setColour(210);
        this.setTooltip(getBlockText('Подключается после блока if или другого else if. Можно подключить к нему else if или else.', 'Connects after if block or another else if. You can connect else if or else to it.'));
    }
};

// Блок ELSE
Blockly.Blocks['controls_else'] = {
    init: function() {
        this.appendStatementInput('THEN')
            .appendField(getBlockText('иначе', 'else'));
        this.setPreviousStatement(true, ['controls_if', 'controls_else_if']);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText('Подключается после блока if или else if. Завершает цепочку условий.', 'Connects after if or else if block. Ends the condition chain.'));
    }
};

// Блоки циклов
Blockly.Blocks['controls_whileUntil'] = {
    init: function() {
        this.appendValueInput("BOOL")
            .setCheck(['Boolean', 'Number'])
            .appendField(getBlockText("пока", "while"));
        this.appendStatementInput("DO")
            .appendField(getBlockText("выполнять", "do"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText("Цикл while", "While loop"));
    }
};

Blockly.Blocks['controls_for'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("для", "for"))
            .appendField(new Blockly.FieldTextInput("i"), "VAR")
            .appendField(getBlockText("от", "from"))
            .appendField(new Blockly.FieldNumber(0), "FROM")
            .appendField(getBlockText("до", "to"))
            .appendField(new Blockly.FieldNumber(10), "TO")
            .appendField(getBlockText("шаг", "step"))
            .appendField(new Blockly.FieldNumber(1), "STEP");
        this.appendStatementInput("DO")
            .appendField(getBlockText("выполнять", "do"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText("Цикл for", "For loop"));
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

Blockly.Blocks['controls_repeat_times'] = {
    init: function() {
        this.appendValueInput("TIMES")
            .setCheck("Number")
            .appendField(getBlockText("Повторить", "Repeat"));
        this.appendStatementInput("DO")
            .appendField(getBlockText("раз выполнить", "times do"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText("Повторить блок указанное количество раз", "Repeat block specified number of times"));
    }
};

Blockly.Blocks['controls_while'] = {
    init: function() {
        this.appendValueInput("CONDITION")
            .setCheck(['Boolean', 'Number'])
            .appendField(getBlockText("🔄 Пока", "🔄 While"));
        this.appendStatementInput("DO")
            .appendField(getBlockText("выполнять", "do"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText("Выполнять блок пока условие истинно", "Execute block while condition is true"));
    }
};