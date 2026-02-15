// Математические и логические блоки

Blockly.Blocks['math_number'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldNumber(0), "NUM");
        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip(getBlockText("Число", "Number"));
    }
};

Blockly.Blocks['math_arithmetic'] = {
    init: function() {
        this.appendValueInput("A")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ["+", "ADD"],
                ["-", "MINUS"],
                ["×", "MULTIPLY"],
                ["÷", "DIVIDE"]
            ]), "OP");
        this.appendValueInput("B")
            .setCheck("Number");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip(getBlockText("Математическая операция", "Math operation"));
    }
};

Blockly.Blocks['math_random'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎲 Случайное число от", "🎲 Random from"))
            .appendField(new Blockly.FieldNumber(0), "FROM")
            .appendField(getBlockText("до", "to"))
            .appendField(new Blockly.FieldNumber(100), "TO");
        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip(getBlockText("Случайное число в указанном диапазоне", "Random number in specified range"));
    }
};

Blockly.Blocks['math_modulo'] = {
    init: function() {
        this.appendValueInput("A")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField(getBlockText("остаток от деления на", "modulo"));
        this.appendValueInput("B")
            .setCheck("Number");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setColour(330);
        this.setTooltip(getBlockText("Остаток от деления", "Modulo operation"));
    }
};

Blockly.Blocks['math_divisible'] = {
    init: function() {
        this.appendValueInput("A")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField(getBlockText("делится на", "divisible by"));
        this.appendValueInput("B")
            .setCheck("Number");
        this.setInputsInline(true);
        this.setOutput(true, "Boolean");
        this.setColour(210);
        this.setTooltip(getBlockText("Проверить делимость числа", "Check if number is divisible"));
    }
};

// Логические блоки
Blockly.Blocks['logic_compare'] = {
    init: function() {
        this.appendValueInput("A")
            .setCheck(null);
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ["=", "EQ"],
                ["≠", "NEQ"],
                ["<", "LT"],
                ["≤", "LTE"],
                [">", "GT"],
                ["≥", "GTE"]
            ]), "OP");
        this.appendValueInput("B")
            .setCheck(null);
        this.setInputsInline(true);
        this.setOutput(true, "Boolean");
        this.setColour(210);
        this.setTooltip(getBlockText("Сравнение", "Comparison"));
    }
};

Blockly.Blocks['logic_operation'] = {
    init: function() {
        this.appendValueInput("A")
            .setCheck("Boolean");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("и", "and"), "AND"],
                [getBlockText("или", "or"), "OR"]
            ]), "OP");
        this.appendValueInput("B")
            .setCheck("Boolean");
        this.setInputsInline(true);
        this.setOutput(true, "Boolean");
        this.setColour(210);
        this.setTooltip(getBlockText("Логическая операция", "Logical operation"));
    }
};

Blockly.Blocks['logic_boolean'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("истина", "true"), "TRUE"],
                [getBlockText("ложь", "false"), "FALSE"]
            ]), "BOOL");
        this.setOutput(true, "Boolean");
        this.setColour(210);
        this.setTooltip(getBlockText("Логическое значение", "Boolean value"));
    }
};

Blockly.Blocks['logic_negate'] = {
    init: function() {
        this.appendValueInput("BOOL")
            .setCheck("Boolean")
            .appendField(getBlockText("не", "not"));
        this.setOutput(true, "Boolean");
        this.setColour(210);
        this.setTooltip(getBlockText("Логическое отрицание (НЕ)", "Logical NOT"));
        this.setHelpUrl("");
    }
};

