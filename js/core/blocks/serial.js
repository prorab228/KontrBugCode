// Блоки для коммуникации

// Serial порт
Blockly.Blocks['serial_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial настройка", "Serial Begin"))
            .appendField(new Blockly.FieldNumber(9600, 300, 115200), "BAUD");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Инициализация Serial порта", "Initialize Serial port"));
    }
};

Blockly.Blocks['serial_print'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial Вывод", "Serial Print"));
        this.appendValueInput("TEXT")
           // .setCheck(["String", "Number", "Boolean"])
            .appendField(getBlockText("Данные", "Data"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Вывод данных в Serial монитор", "Print data to Serial monitor"));
    }
};

Blockly.Blocks['serial_println'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial вывод с новой строки", "Serial Println"));
        this.appendValueInput("TEXT")
         //   .setCheck(["String", "Number", "Boolean"])
            .appendField(getBlockText("Данные", "Data"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Вывод данных в Serial монитор с переводом строки", "Print data to Serial monitor with newline"));
    }
};

Blockly.Blocks['serial_write'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial запись байта", "Serial Write Byte"));
        this.appendValueInput("BYTE")
            .setCheck("Number", "Boolean")
            .appendField(getBlockText("Байт (0-255)", "Byte (0-255)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Запись сырого байта в Serial порт", "Write raw byte to Serial port"));
    }
};

Blockly.Blocks['serial_available'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial данные доступны", "Serial Available"));
        this.setOutput(true, "Boolean");
        this.setColour(230);
        this.setTooltip(getBlockText("Проверить, есть ли данные для чтения в Serial", "Check if Serial data is available"));
    }
};

Blockly.Blocks['serial_read_string'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial прочитать строку", "Serial Read String"));
        this.setOutput(true, "String");
        this.setColour(230);
        this.setTooltip(getBlockText("Прочитать строку из Serial порта", "Read string from Serial port"));
    }
};

Blockly.Blocks['serial_read_number'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial прочитать число", "Serial Read Number"));
        this.setOutput(true, "Number");
        this.setColour(230);
        this.setTooltip(getBlockText("Прочитать число из Serial порта", "Read number from Serial port"));
    }
};

Blockly.Blocks['serial_flush'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial очистить буфер", "Serial Flush"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Очистить буфер Serial порта", "Clear Serial port buffer"));
    }
};

Blockly.Blocks['serial_set_timeout'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial установить таймаут", "Serial Set Timeout"))
            .appendField(new Blockly.FieldNumber(1000, 0, 60000), "TIMEOUT")
            .appendField(getBlockText("мс", "ms"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Установить время ожидания для Serial операций", "Set timeout for Serial operations"));
    }
};

// Блок для чтения байта из Serial
Blockly.Blocks['serial_read_byte'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial прочитать байт", "Serial Read Byte"));
        this.setOutput(true, "Number");
        this.setColour(230);
        this.setTooltip(getBlockText("Прочитать один байт из Serial порта", "Read one byte from Serial port"));
    }
};

// Блок для парсинга Serial команды
Blockly.Blocks['serial_parse_command'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial разобрать команду", "Serial Parse Command"))
            .appendField(new Blockly.FieldTextInput("команда"), "COMMAND");
        this.appendValueInput("DATA")
            .setCheck("String")
            .appendField(getBlockText("данные", "data"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Разобрать команду из Serial данных", "Parse command from Serial data"));
    }
};

// Блок для ожидания данных в Serial
Blockly.Blocks['serial_wait_data'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Ожидать Serial данные", "Wait for Serial Data"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Ожидать поступления данных в Serial порт", "Wait for Serial data to arrive"));
    }
};


// Блок для чтения до определенного символа
Blockly.Blocks['serial_read_until'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Serial прочитать до", "Serial Read Until"))
            .appendField(new Blockly.FieldTextInput("\\n"), "TERMINATOR");
        this.setOutput(true, "String");
        this.setColour(230);
        this.setTooltip(getBlockText("Прочитать данные до указанного символа-разделителя", "Read data until specified delimiter"));
    }
};
