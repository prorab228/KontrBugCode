// Блоки ввода/вывода

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ МЕНЮ ПИНОВ
function getPinMenu(pinType = 'digital') {
    if (!window.BoardManager) {
        const defaultPins = {
            'digital': [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
                       ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["10", "10"],
                       ["11", "11"], ["12", "12"], ["13", "13"]],
            'analog': [["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"],
                      ["A4", "A4"], ["A5", "A5"], ["A6", "A6"], ["A7", "A7"]],
            'pwm': [["3 (PWM)", "3"], ["5 (PWM)", "5"], ["6 (PWM)", "6"],
                   ["9 (PWM)", "9"], ["10 (PWM)", "10"], ["11 (PWM)", "11"]]
        };
        return defaultPins[pinType] || defaultPins.digital;
    }
    return window.BoardManager.getPins(pinType);
}

// Цифровая запись
Blockly.Blocks['digital_write'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Подать на порт", "Digital Write"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN")
            .appendField(getBlockText("Сигнал", "State"))
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("ВКЛ", "HIGH"), "HIGH"],
                [getBlockText("ВЫКЛ", "LOW"), "LOW"]
            ]), "STATE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Установить состояние цифрового вывода", "Set digital pin state"));
    }
};

// Аналоговая запись (PWM)
Blockly.Blocks['analog_write'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("ШИМ сигнал на порт", "Analog Write"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "PIN");
        this.appendValueInput("VALUE")
            .setCheck("Number")
            .appendField(getBlockText("Мощность (0-255)", "Value (0-255)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Установить мощность на выводе от 0 до 255", "Set PWM value on pin"));
    }
};

// Цифровое чтение
Blockly.Blocks['digital_read'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Чтение цифрового порта", "Digital Read"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setOutput(true, "Boolean");
        this.setColour(230);
        this.setTooltip(getBlockText("Прочитать состояние цифрового ввода", "Read digital pin state"));
    }
};

// Аналоговое чтение
Blockly.Blocks['analog_read'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Чтение аналогового порта", "Analog Read"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('analog')), "PIN");
        this.setOutput(true, "Number");
        this.setColour(230);
        this.setTooltip(getBlockText("Прочитать значение аналогового входа", "Read analog input value"));
    }
};

// Настройка режима пина
Blockly.Blocks['pin_mode'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("🔧 Режим работы порта")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN")
            .appendField("Режим")
            .appendField(new Blockly.FieldDropdown([
                ["ВХОД", "INPUT"],
                ["ВЫХОД", "OUTPUT"],
                ["ВХОД_PULLUP", "INPUT_PULLUP"]
            ]), "MODE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(0);
        this.setTooltip("Настроить режим работы вывода");
    }
};

// Экспортируем функцию
if (typeof window !== 'undefined') {
    window.getPinMenu = getPinMenu;
}