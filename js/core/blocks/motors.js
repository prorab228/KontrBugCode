// Блоки для моторов

Blockly.Blocks['motor_dc'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("DC Мотор", "DC Motor"))
            .appendField("PIN1")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN1")
            .appendField("PIN2")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN2");
        this.appendValueInput("SPEED")
            .setCheck("Number")
            .appendField(getBlockText("Скорость (-255 до 255)", "Speed (-255 to 255)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip(getBlockText("Управление DC мотором", "Control DC motor"));
    },

    validate: function() {
        const pin1 = this.getFieldValue('PIN1');
        const pin2 = this.getFieldValue('PIN2');

        if (pin1 === pin2) {
            return getBlockText('PIN1 и PIN2 не могут быть одинаковыми!', 'PIN1 and PIN2 cannot be the same!');
        }

        return null;
    }
};

Blockly.Blocks['controlbug_motors'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("КонтрБагZERO Моторы", "ControlBugZERO Motors"))
            .appendField(getBlockText("Левый", "Left"))
            .appendField(new Blockly.FieldNumber(0, -255, 255), "LEFT")
            .appendField(getBlockText("Правый", "Right"))
            .appendField(new Blockly.FieldNumber(0, -255, 255), "RIGHT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Управление моторами КонтрБагZERO \nЛевый мотор: М1\nПравый мотор: М2", "Control ControlBugZERO motors"));
    }
};

Blockly.Blocks['motor_servo'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Сервомотор", "Servo Motor"))
            .appendField("PIN")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.appendValueInput("ANGLE")
            .setCheck("Number")
            .appendField(getBlockText("Угол (0-180)", "Angle (0-180)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip(getBlockText("Управление сервомотором", "Control servo motor"));
    }
};

Blockly.Blocks['motor_stepper'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Шаговый мотор", "Stepper Motor"))
            .appendField("PIN1")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN1")
            .appendField("PIN2")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN2")
            .appendField("PIN3")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN3")
            .appendField("PIN4")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN4");
        this.appendValueInput("STEPS")
            .setCheck("Number")
            .appendField(getBlockText("Шаги", "Steps"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip(getBlockText("Управление шаговым мотором", "Control stepper motor"));
    }
};

// Драйвер L298N
Blockly.Blocks['l298n_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🚗 Драйвер L298N начать", "🚗 L298N Driver Begin"))
            .appendField("IN1")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "IN1")
            .appendField("IN2")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "IN2")
            .appendField("ENA")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "ENA");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip(getBlockText("Инициализация драйвера моторов L298N\nПодключение мотора:\nOUT1 → мотор +\nOUT2 → мотор -\nПитание:\n12V → внешний источник 7-12V\n5V → 5V Arduino\nGND → общий GND", "Initialize L298N motor driver"));
    }
};

Blockly.Blocks['l298n_motor'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🚗 L298N мотор", "🚗 L298N Motor"))
            .appendField(getBlockText("Скорость", "Speed"))
            .appendField(new Blockly.FieldNumber(0, -255, 255), "SPEED");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip(getBlockText("Управление мотором через драйвер L298N", "Control motor via L298N driver"));
    }
};

Blockly.Blocks['l298n_dual_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🚗 L298N два мотора начать", "🚗 L298N Dual Motors Begin"))
            .appendField("IN1")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "IN1")
            .appendField("IN2")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "IN2")
            .appendField("ENA")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "ENA")
            .appendField("IN3")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "IN3")
            .appendField("IN4")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "IN4")
            .appendField("ENB")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('pwm')), "ENB");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip(getBlockText("Инициализация драйвера L298N для двух моторов", "Initialize L298N driver for two motors"));
    }
};

Blockly.Blocks['l298n_dual_motors'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🚗 L298N два мотора", "🚗 L298N Dual Motors"))
            .appendField(getBlockText("Мотор A", "Motor A"))
            .appendField(new Blockly.FieldNumber(0, -255, 255), "MOTOR_A")
            .appendField(getBlockText("Мотор B", "Motor B"))
            .appendField(new Blockly.FieldNumber(0, -255, 255), "MOTOR_B");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip(getBlockText("Управление двумя моторами через драйвер L298N", "Control two motors via L298N driver"));
    }
};