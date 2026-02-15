// Системные блоки

Blockly.Blocks['delay'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Задержка (мс)", "Delay (ms)"))
            .appendField(new Blockly.FieldNumber(1000, 0), "TIME");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Задержка в миллисекундах", "Delay in milliseconds"));
    }
};

Blockly.Blocks['background_task'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Фоновая задача", "Background Task"))
            .appendField(new Blockly.FieldTextInput("task"), "NAME");
        this.appendStatementInput("SETUP_CODE")
            .appendField(getBlockText("настройка", "setup"));
        this.appendStatementInput("LOOP_CODE")
            .appendField(getBlockText("выполнять", "loop"));
        this.setColour(180);
        this.setTooltip(getBlockText("Фоновая задача, выполняемая параллельно с основным циклом", "Background task running parallel to main loop"));
    }
};

// Прерывания
Blockly.Blocks['interrupt_attach'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⚡ Прерывание", "⚡ Interrupt"))
            .appendField("PIN")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN")
            .appendField(getBlockText("режим", "mode"))
            .appendField(new Blockly.FieldDropdown([
                ["RISING", "RISING"],
                ["FALLING", "FALLING"],
                ["CHANGE", "CHANGE"],
                ["LOW", "LOW"]
            ]), "MODE");
        this.appendStatementInput("DO")
            .appendField(getBlockText("выполнить", "execute"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText("Прикрепить прерывание к пину", "Attach interrupt to pin"));
    }
};

Blockly.Blocks['interrupt_detach'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⚡ Отключить прерывание", "⚡ Detach Interrupt"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(210);
        this.setTooltip(getBlockText("Отключить прерывание на пине", "Detach interrupt from pin"));
    }
};

// EEPROM
Blockly.Blocks['eeprom_write'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💾 EEPROM записать", "💾 EEPROM Write"))
            .appendField(getBlockText("адрес", "address"))
            .appendField(new Blockly.FieldNumber(0, 0, 1023, 1), "ADDRESS");
        this.appendValueInput("DATA")
            .setCheck(["Number", "String"])
            .appendField(getBlockText("данные", "data"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Записать данные в EEPROM", "Write data to EEPROM"));
    }
};

Blockly.Blocks['eeprom_read'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💾 EEPROM прочитать", "💾 EEPROM Read"))
            .appendField(getBlockText("адрес", "address"))
            .appendField(new Blockly.FieldNumber(0, 0, 1023, 1), "ADDRESS");
        this.setOutput(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Прочитать данные из EEPROM", "Read data from EEPROM"));
    }
};