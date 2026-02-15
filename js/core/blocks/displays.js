// Блоки для дисплеев

// OLED дисплей
Blockly.Blocks['display_oled_text'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("OLED Текст", "OLED Display Text"));
        this.appendValueInput("TEXT")
            .setCheck("String")
            .appendField(getBlockText("Текст", "Text"));
        this.appendValueInput("X")
            .setCheck("Number")
            .appendField("X");
        this.appendValueInput("Y")
            .setCheck("Number")
            .appendField("Y");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Вывод текста на OLED дисплей", "Display text on OLED"));
    }
};

Blockly.Blocks['display_oled_clear'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("OLED Очистить", "OLED Clear Display"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
        this.setTooltip(getBlockText("Очистка OLED дисплея", "Clear OLED display"));
    }
};

// LCD дисплей 16x2
Blockly.Blocks['lcd_i2c_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("LCD 16x2 I2C начать", "LCD 16x2 I2C Begin"))
            .appendField(getBlockText("Адрес", "Address"))
            .appendField(new Blockly.FieldDropdown([
                ["0x27", "0x27"],
                ["0x3F", "0x3F"],
                ["0x20", "0x20"],
                ["0x38", "0x38"]
            ]), "ADDRESS");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
        this.setTooltip(getBlockText("Инициализация LCD дисплея 16x2 по I2C\nПодключение:\nSDA → A4\nSCL → A5\nVCC → 5V\nGND → GND\nДля поиска адреса используйте I2C сканер", "Initialize LCD 16x2 display via I2C"));
    }
};

Blockly.Blocks['lcd_spi_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🖥️ LCD 16x2 SPI начать", "🖥️ LCD 16x2 SPI Begin"))
            .appendField("RS")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "RS")
            .appendField("E")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "E")
            .appendField("D4")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "D4")
            .appendField("D5")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "D5")
            .appendField("D6")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "D6")
            .appendField("D7")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "D7");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
        this.setTooltip(getBlockText("Инициализация LCD дисплея 16x2 по SPI (4-битный режим)", "Initialize LCD 16x2 display via SPI (4-bit mode)"));
    }
};

Blockly.Blocks['lcd_print'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🖥️ LCD текст", "🖥️ LCD Print"))
            .appendField(getBlockText("Строка", "Row"))
            .appendField(new Blockly.FieldNumber(0, 0, 1), "ROW")
            .appendField(getBlockText("Колонка", "Column"))
            .appendField(new Blockly.FieldNumber(0, 0, 15), "COL");
        this.appendValueInput("TEXT")
            .setCheck("String")
            .appendField(getBlockText("Текст", "Text"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
        this.setTooltip(getBlockText("Вывод текста на LCD дисплей", "Print text on LCD display"));
    }
};

Blockly.Blocks['lcd_clear'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🖥️ LCD очистить", "🖥️ LCD Clear"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
        this.setTooltip(getBlockText("Очистка LCD дисплея", "Clear LCD display"));
    }
};

Blockly.Blocks['lcd_backlight'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🖥️ LCD подсветка", "🖥️ LCD Backlight"))
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("ВКЛ", "ON"), "ON"],
                [getBlockText("ВЫКЛ", "OFF"), "OFF"]
            ]), "STATE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
        this.setTooltip(getBlockText("Управление подсветкой LCD дисплея", "Control LCD backlight"));
    }
};