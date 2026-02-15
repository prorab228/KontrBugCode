// Блоки для времени

Blockly.Blocks['time_seconds'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⏱️ Секунд с запуска", "⏱️ Seconds since start"));
        this.setOutput(true, "Number");
        this.setColour(230);
        this.setTooltip(getBlockText("Количество секунд с момента запуска программы", "Seconds since program start"));
    }
};

Blockly.Blocks['time_after_seconds'] = {
    init: function() {
        this.appendValueInput("SECONDS")
            .setCheck("Number")
            .appendField(getBlockText("⏰ Через", "⏰ After"));
        this.appendStatementInput("DO")
            .appendField(getBlockText("секунд выполнить", "seconds do"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Выполнить блок через указанное количество секунд", "Execute block after specified seconds"));
    }
};

// RTC часы
Blockly.Blocks['rtc_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🕒 RTC начать", "🕒 RTC Begin"))
            .appendField(getBlockText("Модуль", "Module"))
            .appendField(new Blockly.FieldDropdown([
                ["DS1302", "DS1302"],
                ["DS1307", "DS1307"],
                ["DS3231", "DS3231"]
            ]), "MODULE");

        // Input для пинов DS1302
        this.ds1302Input = this.appendDummyInput()
            .appendField("RST")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "RST_PIN")
            .appendField("DAT")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "DAT_PIN")
            .appendField("CLK")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "CLK_PIN");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);

        // Инициализируем видимость при создании
        this.updatePinVisibility_();
    },

    updatePinVisibility_: function() {
        const module = this.getFieldValue('MODULE');

        if (module === 'DS1302') {
            this.ds1302Input.setVisible(true);
            this.setTooltip(getBlockText("Инициализация DS1302\nТребует подключения:\nRST - Reset (пин 6)\nDAT - Data (пин 7)  \nCLK - Clock (пин 8)\nБатарейка CR2032 для сохранения времени", "Initialize DS1302 RTC module"));
        }
        else {
            this.ds1302Input.setVisible(false);

            if (module === 'DS1307') {
                this.setTooltip(getBlockText("Инициализация DS1307 по I2C\nАвтоматическое подключение:\nSDA → A4\nSCL → A5\nVCC → 5V\nGND → GND\nБатарейка CR2032 для сохранения времени", "Initialize DS1307 RTC module via I2C"));
            } else if (module === 'DS3231') {
                this.setTooltip(getBlockText("Инициализация DS3231 по I2C\nАвтоматическое подключение:\nSDA → A4\nSCL → A5\nVCC → 5V\nGND → GND\nВысокая точность: ±2 мин/год\nБатарейка CR2032", "Initialize DS3231 RTC module via I2C"));
            }
        }
    },

    onchange: function() {
        this.updatePinVisibility_();
        this.render();
    }
};

Blockly.Blocks['rtc_set_datetime'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🕒 RTC установить дату/время", "🕒 RTC Set Date/Time"))
            .appendField(getBlockText("Год", "Year"))
            .appendField(new Blockly.FieldNumber(2024, 2000, 2100), "YEAR")
            .appendField(getBlockText("Месяц", "Month"))
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("Январь (1)", "January (1)"), "1"],
                [getBlockText("Февраль (2)", "February (2)"), "2"],
                [getBlockText("Март (3)", "March (3)"), "3"],
                [getBlockText("Апрель (4)", "April (4)"), "4"],
                [getBlockText("Май (5)", "May (5)"), "5"],
                [getBlockText("Июнь (6)", "June (6)"), "6"],
                [getBlockText("Июль (7)", "July (7)"), "7"],
                [getBlockText("Август (8)", "August (8)"), "8"],
                [getBlockText("Сентябрь (9)", "September (9)"), "9"],
                [getBlockText("Октябрь (10)", "October (10)"), "10"],
                [getBlockText("Ноябрь (11)", "November (11)"), "11"],
                [getBlockText("Декабрь (12)", "December (12)"), "12"]
            ]), "MONTH")
            .appendField(getBlockText("День", "Day"))
            .appendField(new Blockly.FieldNumber(1, 1, 31), "DAY");

        this.appendDummyInput()
            .appendField(getBlockText("Час", "Hour"))
            .appendField(new Blockly.FieldNumber(12, 0, 23), "HOUR")
            .appendField(getBlockText("Минута", "Minute"))
            .appendField(new Blockly.FieldNumber(0, 0, 59), "MINUTE")
            .appendField(getBlockText("Секунда", "Second"))
            .appendField(new Blockly.FieldNumber(0, 0, 59), "SECOND");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip(getBlockText("Установка даты и времени на RTC модуле\nПосле установки время будет сохраняться\nдаже при отключении питания", "Set date and time on RTC module"));
    }
};

Blockly.Blocks['rtc_read_date'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🕒 RTC прочитать дату", "🕒 RTC Read Date"));
        this.setOutput(true, "String");
        this.setColour(230);
        this.setTooltip(getBlockText("Чтение даты с RTC модуля\nФормат: ДД.ММ.ГГГГ\nТочность: ±2 минуты в месяц (DS3231)\nТребует предварительной инициализации", "Read date from RTC module"));
    }
};

Blockly.Blocks['rtc_read_time'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🕒 RTC прочитать время", "🕒 RTC Read Time"));
        this.setOutput(true, "String");
        this.setColour(230);
        this.setTooltip(getBlockText("Чтение времени с RTC модуля\nФормат: ЧЧ:ММ:СС\nБатарейка CR2032 сохраняет время\nпри отключении питания", "Read time from RTC module"));
    }
};

Blockly.Blocks['rtc_read_weekday'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🕒 RTC прочитать день недели", "🕒 RTC Read Weekday"));
        this.setOutput(true, "String");
        this.setColour(230);
        this.setTooltip(getBlockText("Чтение дня недели с RTC модуля\nФормат: Пн, Вт, Ср, Чт, Пт, Сб, Вс\nАвтоматически рассчитывается\nна основе даты", "Read weekday from RTC module"));
    }
};