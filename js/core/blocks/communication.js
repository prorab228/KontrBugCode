
// Bluetooth
Blockly.Blocks['bluetooth_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Инициализация Bluetooth", "Bluetooth Init"))
            .appendField("RX")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "RX_PIN")
            .appendField("TX")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "TX_PIN")
            .appendField(getBlockText("скорость", "baud"))
            .appendField(new Blockly.FieldNumber(9600, 300, 115200), "BAUD");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
        this.setTooltip(getBlockText("Инициализация Bluetooth модуля HC-05/06\nПодключение:\nRX → TX Arduino\nTX → RX Arduino\nVCC → 5V\nGND → GND\nKEY → 3.3V (для входа в AT-режим)", "Initialize HC-05/06 Bluetooth module"));
    }
};

Blockly.Blocks['bluetooth_send'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Bluetooth Отправить", "Bluetooth Send"));
        this.appendValueInput("DATA")
            .setCheck("String")
            .appendField(getBlockText("Данные", "Data"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
        this.setTooltip(getBlockText("Отправка данных через Bluetooth", "Send data via Bluetooth"));
    }
};

Blockly.Blocks['bluetooth_receive'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Bluetooth Получить", "Bluetooth Receive"));
        this.setOutput(true, "String");
        this.setColour(290);
        this.setTooltip(getBlockText("Получение данных через Bluetooth", "Receive data via Bluetooth"));
    }
};

Blockly.Blocks['bluetooth_available'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Bluetooth данные доступны", "Bluetooth available"));
        this.setOutput(true, "Number");
        this.setColour(290);
        this.setTooltip(getBlockText("Проверить, сколько байт для чтения есть в Bluetooth", "Check if data is available"));
    }
};

// IR передатчик и приемник
Blockly.Blocks['ir_transmitter_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 IR передатчик на пине", "📡 IR Transmitter on pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "PIN");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(200);
        this.setTooltip(getBlockText("Инициализация IR передатчика", "Initialize IR transmitter"));
    }
};

Blockly.Blocks['ir_transmitter_send'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 IR передать код", "📡 IR Send Code"))
            .appendField(new Blockly.FieldNumber(0, 0, 65535), "CODE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(200);
        this.setTooltip(getBlockText("Отправить IR код", "Send IR code"));
    }
};

Blockly.Blocks['ir_receiver_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 IR приемник на пине", "📡 IR Receiver on pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(200);
        this.setTooltip(getBlockText("Инициализация ИК приемника VS1838/TSOP4838\nПодключение:\nOUT → цифровой пин\nVCC → 3.3V-5V\nGND → GND\nРаботает с пультами TV/DVD/AC", "Initialize IR receiver VS1838/TSOP4838"));
    }
};

Blockly.Blocks['ir_receiver_read'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 IR прочитать код", "📡 IR Read Code"));
        this.setOutput(true, "Number");
        this.setColour(200);
        this.setTooltip(getBlockText("Прочитать IR код", "Read IR code"));
    }
};

