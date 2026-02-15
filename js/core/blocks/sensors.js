// Блоки для датчиков

Blockly.Blocks['sensor_ultrasonic'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 Ультразвуковой датчик HC-SR04", "📡 HC-SR04 Ultrasonic"))
            .appendField(getBlockText("Trig", "Trig"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "TRIG")
            .appendField(getBlockText("Echo", "Echo"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "ECHO");
        this.setOutput(true, "Number");
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Измерение расстояния ультразвуковым датчиком HC-SR04\nДиапазон: 2-400 см\nТочность: ±3 мм\nПодключение:\nVCC → 5V\nTrig → цифровой пин\nEcho → цифровой пин\nGND → GND", "Distance measurement with HC-SR04 ultrasonic sensor"));
    }
};

Blockly.Blocks['sensor_ir_obstacle'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🚧 ИК датчик препятствия", "🚧 IR Obstacle Sensor"))
            .appendField("PIN")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setOutput(true, "Boolean");
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Обнаружение препятствия ИК датчиком", "Obstacle detection with IR sensor"));
    }
};

Blockly.Blocks['sensor_ir_line'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⚫ ИК датчик линии", "⚫ IR Line Sensor"))
            .appendField("PIN")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setOutput(true, "Boolean");
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Обнаружение черной линии ИК датчиком", "Black line detection with IR sensor"));
    }
};

Blockly.Blocks['sensor_sound'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎤 Датчик звука", "🎤 Sound Sensor"))
            .appendField("PIN")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('analog')), "PIN");
        this.setOutput(true, "Number");
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Измерение уровня звука", "Sound level measurement"));
    }
};

Blockly.Blocks['sensor_vl53lox'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Лазерный датчик VL53L0X", "VL53L0X Laser"));
        this.setOutput(true, "Number");
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Измерение расстояния лазерным датчиком VL53L0X\nДиапазон: 30-1000 мм\nТочность: ±3%\nИнтерфейс: I2C\nПодключение:\nSDA → A4\nSCL → A5\nVCC → 3.3V\nGND → GND\nXSHUT → не подключать", "Distance measurement with VL53L0X laser sensor"));
    }
};

Blockly.Blocks['sensor_tcs3472'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Датчик цвета TCS3472", "TCS3472 Color Sensor"));
        this.setOutput(true, "String");
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Определение цвета датчиком TCS34725\nДиапазон: RGB + прозрачность\nИнтерфейс: I2C\nПодключение:\nSDA → A4\nSCL → A5\nVCC → 3.3V\nGND → GND\nLED → 3.3V (подсветка)", "Color detection with TCS3472 sensor"));
    }
};

Blockly.Blocks['sensor_button'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("Кнопка", "Button"))
            .appendField("PIN")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setOutput(true, "Boolean");
        this.setColour('#00c853');
        this.setTooltip(getBlockText("Считывание состояния кнопки", "Read button state"));
    }
};

// Датчик температуры DS18B20
Blockly.Blocks['ds18b20_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("DS18B20 на пине", "DS18B20 on pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip(getBlockText("Инициализация датчика температуры DS18B20\nПодключение:\nDATA → цифровой пин + подтяжка 4.7к к 5V\nVCC → 5V\nGND → GND\nТочность: ±0.5°C\nДиапазон: -55°C до +125°C", "Initialize DS18B20 temperature sensor"));
    }
};

Blockly.Blocks['ds18b20_read_temp'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🌡️ DS18B20 температура", "🌡️ DS18B20 Temperature"));
        this.setOutput(true, "Number");
        this.setColour(120);
        this.setTooltip(getBlockText("Прочитать температуру с DS18B20", "Read temperature from DS18B20"));
    }
};

// Энкодер
Blockly.Blocks['encoder_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎛️ Энкoder", "🎛️ Encoder"))
            .appendField("CLK")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "CLK")
            .appendField("DT")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "DT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip(getBlockText("Инициализировать энкодер", "Initialize encoder"));
    }
};

Blockly.Blocks['encoder_read'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎛️ Прочитать энкодер", "🎛️ Read Encoder"));
        this.setOutput(true, "Number");
        this.setColour(120);
        this.setTooltip(getBlockText("Прочитать значение энкодера", "Read encoder value"));
    }
};


// Блоки для датчика DHT (поддержка Arduino и ESP)
Blockly.Blocks['dht_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🌡️ Датчик DHT", "🌡️ DHT Sensor"))
            .appendField(getBlockText("Тип", "Type"))
            .appendField(new Blockly.FieldDropdown([
                ["DHT11", "DHT11"],
                ["DHT22", "DHT22"],
                ["DHT21", "DHT21"]
            ]), "TYPE")
            .appendField(getBlockText("Пин", "Pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#00c853');
        this.setTooltip(getBlockText(
            "Инициализация датчика температуры и влажности DHT\n" +
            "DHT11: Температура 0-50°C (±2°C), Влажность 20-80% (±5%)\n" +
            "DHT22: Температура -40-80°C (±0.5°C), Влажность 0-100% (±2%)\n" +
            "Подключение: DATA→цифровой пин, VCC→3.3V/5V, GND→GND",
            "Initialize DHT temperature and humidity sensor"
        ));
    }
};

Blockly.Blocks['dht_read_temperature'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🌡️ DHT температура", "🌡️ DHT Temperature"))
            .appendField(getBlockText("в", "in"))
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("°C", "°C"), "C"],
                [getBlockText("°F", "°F"), "F"]
            ]), "UNIT");
        this.setOutput(true, "Number");
        this.setColour('#00c853');
        this.setTooltip(getBlockText(
            "Прочитать температуру с датчика DHT",
            "Read temperature from DHT sensor"
        ));
    }
};

Blockly.Blocks['dht_read_humidity'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💧 DHT влажность", "💧 DHT Humidity"));
        this.setOutput(true, "Number");
        this.setColour('#00c853');
        this.setTooltip(getBlockText(
            "Прочитать влажность с датчика DHT",
            "Read humidity from DHT sensor"
        ));
    }
};

Blockly.Blocks['dht_compute_heat_index'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🔥 DHT индекс тепла", "🔥 DHT Heat Index"))
            .appendField(getBlockText("в", "in"))
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("°C", "°C"), "C"],
                [getBlockText("°F", "°F"), "F"]
            ]), "UNIT");
        this.setOutput(true, "Number");
        this.setColour('#00c853');
        this.setTooltip(getBlockText(
            "Вычислить индекс тепла (ощущаемую температуру) на основе температуры и влажности",
            "Compute heat index (feels like temperature) based on temperature and humidity"
        ));
    }
};

// Дополнительный блок для считывания обоих значений сразу
Blockly.Blocks['dht_read_all'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📊 DHT все данные", "📊 DHT All Data"));
        this.setOutput(true, "Array");
        this.setColour('#00c853');
        this.setTooltip(getBlockText(
            "Прочитать температуру и влажность с датчика DHT. Возвращает массив [температура, влажность]",
            "Read temperature and humidity from DHT sensor. Returns array [temperature, humidity]"
        ));
    }
};