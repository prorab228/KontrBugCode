// Блоки для светодиодов и подсветки

// RGB диод (общий катод)
Blockly.Blocks['rgb_led_common_cathode'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🌈 RGB диод (общий катод)", "🌈 RGB LED (Common Cathode)"))
            .appendField("R")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "R_PIN")
            .appendField("G")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "G_PIN")
            .appendField("B")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "B_PIN");
        this.appendValueInput("RED")
            .setCheck("Number")
            .appendField(getBlockText("Красный (0-255)", "Red (0-255)"));
        this.appendValueInput("GREEN")
            .setCheck("Number")
            .appendField(getBlockText("Зеленый (0-255)", "Green (0-255)"));
        this.appendValueInput("BLUE")
            .setCheck("Number")
            .appendField(getBlockText("Синий (0-255)", "Blue (0-255)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Управление RGB диодом с общим катодом", "Control RGB LED with common cathode"));
    }
};

// RGB диод (общий анод)
Blockly.Blocks['rgb_led_common_anode'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🌈 RGB диод (общий анод)", "🌈 RGB LED (Common Anode)"))
            .appendField("R")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "R_PIN")
            .appendField("G")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "G_PIN")
            .appendField("B")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "B_PIN");
        this.appendValueInput("RED")
            .setCheck("Number")
            .appendField(getBlockText("Красный (0-255)", "Red (0-255)"));
        this.appendValueInput("GREEN")
            .setCheck("Number")
            .appendField(getBlockText("Зеленый (0-255)", "Green (0-255)"));
        this.appendValueInput("BLUE")
            .setCheck("Number")
            .appendField(getBlockText("Синий (0-255)", "Blue (0-255)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Управление RGB диодом с общим анодом", "Control RGB LED with common anode"));
    }
};

// Адресная LED лента (WS2812/NeoPixel)
Blockly.Blocks['neopixel_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💡 Адресная лента начать", "💡 NeoPixel Begin"))
            .appendField(getBlockText("Пин", "Pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN")
            .appendField(getBlockText("Количество", "Count"))
            .appendField(new Blockly.FieldNumber(1, 1, 256), "COUNT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Инициализация адресной LED ленты WS2812/NeoPixel\nПодключение:\nDATA → цифровой пин\n5V → 5V (для >10 диодов - внешний источник)\nGND → GND\nКонденсатор 1000мкФ между 5V и GND\nРезистор 470 Ом на DATA", "Initialize WS2812/NeoPixel LED strip"));
    }
};

Blockly.Blocks['neopixel_set_color'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💡 Адресная лента цвет", "💡 NeoPixel Set Color"))
            .appendField(getBlockText("Пиксель", "Pixel"))
            .appendField(new Blockly.FieldNumber(0, 0, 255), "PIXEL");
        this.appendValueInput("RED")
            .setCheck("Number")
            .appendField(getBlockText("Красный (0-255)", "Red (0-255)"));
        this.appendValueInput("GREEN")
            .setCheck("Number")
            .appendField(getBlockText("Зеленый (0-255)", "Green (0-255)"));
        this.appendValueInput("BLUE")
            .setCheck("Number")
            .appendField(getBlockText("Синий (0-255)", "Blue (0-255)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Установка цвета отдельного пикселя адресной ленты", "Set color of individual NeoPixel"));
    }
};

Blockly.Blocks['neopixel_show'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💡 Адресная лента показать", "💡 NeoPixel Show"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Применить изменения на адресной ленте", "Apply changes to NeoPixel strip"));
    }
};

Blockly.Blocks['neopixel_clear'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💡 Адресная лента очистить", "💡 NeoPixel Clear"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(330);
        this.setTooltip(getBlockText("Очистка адресной ленты (все пиксели выключить)", "Clear NeoPixel strip (turn off all pixels)"));
    }
};