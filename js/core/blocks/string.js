// Текстовые блоки
Blockly.Blocks['text'] = {
    init: function() {
        this.appendDummyInput()
            .appendField('\"');
        this.appendDummyInput()
            .appendField(new Blockly.FieldTextInput(""), "TEXT");
        this.appendDummyInput()
            .appendField('\"');
        this.setOutput(true, "String");
        this.setInputsInline(true);
        this.setColour(160);
        this.setTooltip(getBlockText("Текстовая строка", "Text string"));
    }
};

Blockly.Blocks['text_join'] = {
    init: function() {
        this.appendValueInput("TEXT1")
            .setCheck("String");
        this.appendDummyInput()
            .appendField("+");
        this.appendValueInput("TEXT2")
            .setCheck("String");
        this.setInputsInline(true);
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Объединить два текста", "Join two texts"));
    }
};

Blockly.Blocks['text_length'] = {
    init: function() {
        this.appendValueInput("TEXT")
            .setCheck("String")
            .appendField(getBlockText("📏 Длина текста", "📏 Text length"));
        this.setOutput(true, "Number");
        this.setColour(160);
        this.setTooltip(getBlockText("Количество символов в тексте", "Number of characters in text"));
    }
};

Blockly.Blocks['text_convert_to_string'] = {
    init: function() {
        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField(getBlockText("📝 Преобразовать в строку", "📝 Convert to String"));
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Преобразовать любое значение в текстовую строку", "Convert any value to text string"));
    }
};

// Блок для парсинга Serial команды
Blockly.Blocks['text_start_with'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Начинается с", "start with"))
            .appendField(new Blockly.FieldTextInput("команда"), "COMMAND");
        this.appendValueInput("DATA")
            .setCheck("String")
            .appendField(getBlockText("строка", "data"));
        this.setOutput(true, "Boolean");
        this.setColour(160);
        this.setTooltip(getBlockText("Строка начинается с, подходит для разбора команд", "start with"));
    }
};