// Блоки для ESP8266/ESP32

// WiFi
Blockly.Blocks['esp_wifi_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📶 WiFi подключение", "📶 WiFi Connection"))
            .appendField("SSID")
            .appendField(new Blockly.FieldTextInput("my_wifi"), "SSID")
            .appendField(getBlockText("Пароль", "Password"))
            .appendField(new Blockly.FieldTextInput("password"), "PASSWORD");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Подключение к WiFi сети", "Connect to WiFi network"));
    }
};

Blockly.Blocks['esp_wifi_connected'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📶 WiFi подключен?", "📶 WiFi Connected?"));
        this.setOutput(true, "Boolean");
        this.setColour(160);
        this.setTooltip(getBlockText("Проверить подключение к WiFi", "Check WiFi connection"));
    }
};

Blockly.Blocks['esp_wifi_ip'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📶 Получить IP адрес", "📶 Get IP Address"));
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Получить текущий IP адрес устройства", "Get device IP address"));
    }
};

// HTTP
Blockly.Blocks['esp_http_get'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🌐 HTTP GET запрос", "🌐 HTTP GET Request"))
            .appendField("URL")
            .appendField(new Blockly.FieldTextInput("http://example.com"), "URL");
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Выполнить HTTP GET запрос и получить ответ", "Execute HTTP GET request and get response"));
    }
};

Blockly.Blocks['esp_http_post'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🌐 HTTP POST запрос", "🌐 HTTP POST Request"))
            .appendField("URL")
            .appendField(new Blockly.FieldTextInput("http://example.com"), "URL");
        this.appendValueInput("DATA")
            .setCheck("String")
            .appendField(getBlockText("Данные", "Data"));
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Выполнить HTTP POST запрос с данными", "Execute HTTP POST request with data"));
    }
};

// MQTT
Blockly.Blocks['esp_mqtt_connect'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 MQTT подключение", "📡 MQTT Connection"))
            .appendField(getBlockText("Сервер", "Server"))
            .appendField(new Blockly.FieldTextInput("mqtt.server.com"), "SERVER")
            .appendField(getBlockText("Порт", "Port"))
            .appendField(new Blockly.FieldNumber(1883, 1, 65535), "PORT")
            .appendField(getBlockText("Логин", "Username"))
            .appendField(new Blockly.FieldTextInput(""), "USER")
            .appendField(getBlockText("Пароль", "Password"))
            .appendField(new Blockly.FieldTextInput(""), "PASSWORD")
            .appendField(getBlockText("clientId", "clientId"))
            .appendField(new Blockly.FieldTextInput("ESP_8266_1232"), "CLIENT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Подключение к MQTT брокеру", "Connect to MQTT broker"));
    }
};

Blockly.Blocks['esp_mqtt_publish'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 MQTT отправить", "📡 MQTT Publish"))
            .appendField(getBlockText("Топик", "Topic"))
            .appendField(new Blockly.FieldTextInput("home/sensor"), "TOPIC");
        this.appendValueInput("MESSAGE")
            .setCheck("String")
            .appendField(getBlockText("Сообщение", "Message"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Опубликовать сообщение в MQTT топик", "Publish message to MQTT topic"));
    }
};

Blockly.Blocks['esp_mqtt_subscribe'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 MQTT подписаться", "📡 MQTT Subscribe"))
            .appendField(getBlockText("Топик", "Topic"))
            .appendField(new Blockly.FieldTextInput("home/sensor"), "TOPIC")
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("высокое", "high"), "HIGH"],
                [getBlockText("низкое", "low"), "LOW"]
            ]), "QOS");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Подписаться на MQTT топик с указанием качества обслуживания (QoS)", "Subscribe to MQTT topic with QoS"));
    }
};

Blockly.Blocks['esp_mqtt_receive'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 MQTT получить сообщение", "📡 MQTT Receive Message"))
            .appendField(new Blockly.FieldTextInput(""), "TOPIC");
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Получить последнее MQTT сообщение из указанного топика", "Get last MQTT message from specified topic"));
    }
};

// Веб-сервер
Blockly.Blocks['esp_webserver_begin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🖥️ Веб-сервер начать", "🖥️ Web Server Begin"))
            .appendField(getBlockText("Порт", "Port"))
            .appendField(new Blockly.FieldNumber(80, 1, 65535), "PORT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Запустить веб-сервер на указанном порту", "Start web server on specified port"));
    }
};

Blockly.Blocks['esp_webserver_handle'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🖥️ Обработать веб-клиента", "🖥️ Handle Web Client"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Обработать входящие веб-запросы", "Handle incoming web requests"));
    }
};

// Другие ESP функции
Blockly.Blocks['esp_ntp_time'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⏰ NTP время", "⏰ NTP Time"));
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Получить текущее время с NTP сервера", "Get current time from NTP server"));
    }
};

Blockly.Blocks['esp_ntp_date'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⏰ NTP дата", "⏰ NTP date"));
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText("Получить текущую дату с NTP сервера", "Get current date from NTP server"));
    }
};

// Цифровая запись
Blockly.Blocks['esp_ntp_set_time_zone'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⏰ Установить часовой пояс", "⏰ Set time zone"))
            .appendField(new Blockly.FieldDropdown([
                ['UTC', "0"],['UTC+1', "1"],['UTC+2', "2"],['UTC+3', "3"],['UTC+4', "4"],['UTC+5', "5"],['UTC+6', "6"],
                ['UTC+7', "7"],['UTC+8', "8"],['UTC+9', "9"],['UTC+10', "10"],['UTC+11', "11"],['UTC+12', "12"],
                ['UTC-1', "-1"],['UTC-2', "-2"],['UTC-3', "-3"],['UTC-4', "-4"],['UTC-5', "-5"],['UTC-6', "-6"],
                ['UTC-7', "-7"],['UTC-8', "-8"],['UTC-9', "-9"],['UTC-10', "-10"],['UTC-11', "-11"],['UTC-12', "-12"]

            ]), "TIMEZONE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Установить часовой пояс Ntp", "Set time zone Ntp"));
    }
};



Blockly.Blocks['esp_deep_sleep'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("💤 Deep Sleep", "💤 Deep Sleep"))
            .appendField(new Blockly.FieldNumber(30, 1, 3600), "SECONDS")
            .appendField(getBlockText("секунд", "seconds"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Перевести ESP в режим глубокого сна", "Put ESP into deep sleep mode"));
    }
};

// ESP32 специфичные блоки
Blockly.Blocks['esp32_touch_read'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("👆 ESP32 сенсор касания", "👆 ESP32 Touch Sensor"))
            .appendField(getBlockText("Пин", "Pin"))
            .appendField(new Blockly.FieldDropdown([
                ["T0", "T0"], ["T1", "T1"], ["T2", "T2"], ["T3", "T3"],
                ["T4", "T4"], ["T5", "T5"], ["T6", "T6"], ["T7", "T7"],
                ["T8", "T8"], ["T9", "T9"]
            ]), "PIN");
        this.setOutput(true, "Number");
        this.setColour(160);
        this.setTooltip(getBlockText("Прочитать значение сенсора касания ESP32", "Read ESP32 touch sensor value"));
    }
};

Blockly.Blocks['esp32_ledc_pwm'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎛️ ESP32 LEDC PWM", "🎛️ ESP32 LEDC PWM"))
            .appendField(getBlockText("Пин", "Pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN")
            .appendField(getBlockText("Канал", "Channel"))
            .appendField(new Blockly.FieldNumber(0, 0, 15), "CHANNEL")
            .appendField(getBlockText("Частота", "Frequency"))
            .appendField(new Blockly.FieldNumber(1000, 1, 40000), "FREQUENCY");
        this.appendValueInput("DUTY")
            .setCheck("Number")
            .appendField(getBlockText("Заполнение (0-255)", "Duty (0-255)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Использовать LEDC PWM для точного ШИМ на ESP32", "Use LEDC PWM for precise PWM on ESP32"));
    }
};


// Wi-Fi сканирование
Blockly.Blocks['esp_wifi_scan'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📶 Сканировать Wi-Fi сети", "📶 Scan Wi-Fi Networks"));
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Сканировать доступные Wi-Fi сети. Возвращает массив объектов с информацией о сетях",
            "Scan available Wi-Fi networks. Returns array of network objects"
        ));
    }
};

// Статус Wi-Fi
Blockly.Blocks['esp_wifi_status'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📶 Статус Wi-Fi", "📶 Wi-Fi Status"));
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Получить текущий статус Wi-Fi подключения",
            "Get current Wi-Fi connection status"
        ));
    }
};

// Проверка подключения MQTT
Blockly.Blocks['esp_mqtt_connected'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 MQTT подключен?", "📡 MQTT Connected?"));
        this.setOutput(true, "Boolean");
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Проверить, подключен ли клиент к MQTT брокеру",
            "Check if client is connected to MQTT broker"
        ));
    }
};

// Отключение от MQTT
Blockly.Blocks['esp_mqtt_disconnect'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 Отключиться от MQTT", "📡 Disconnect from MQTT"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Отключиться от MQTT брокера",
            "Disconnect from MQTT broker"
        ));
    }
};

// Last Will and Testament (LWT)
Blockly.Blocks['esp_mqtt_last_will'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 MQTT Last Will", "📡 MQTT Last Will"))
            .appendField(getBlockText("Топик", "Topic"))
            .appendField(new Blockly.FieldTextInput("device/status"), "TOPIC")
            .appendField(getBlockText("Сообщение", "Message"))
            .appendField(new Blockly.FieldTextInput("offline"), "MESSAGE")
            .appendField(getBlockText("QoS", "QoS"))
            .appendField(new Blockly.FieldDropdown([
                ["0", "0"],
                ["1", "1"],
                ["2", "2"]
            ]), "QOS")
            .appendField(getBlockText("Retain", "Retain"))
            .appendField(new Blockly.FieldCheckbox("true"), "RETAIN");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Установить Last Will and Testament сообщение, которое будет отправлено при неожиданном отключении\n" +
            "QoS 0: максимум один раз\n" +
            "QoS 1: минимум один раз\n" +
            "QoS 2: ровно один раз",
            "Set Last Will and Testament message that will be sent on unexpected disconnection"
        ));
    }
};

// Переподключение к MQTT
Blockly.Blocks['esp_mqtt_reconnect'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 Переподключиться к MQTT", "📡 Reconnect to MQTT"))
            .appendField(getBlockText("Таймаут", "Timeout"))
            .appendField(new Blockly.FieldNumber(5000, 1000, 60000, 1000), "TIMEOUT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Попытаться переподключиться к MQTT брокеру с указанным таймаутом (мс)",
            "Attempt to reconnect to MQTT broker with specified timeout (ms)"
        ));
    }
};

// Получение количества сетей Wi-Fi
Blockly.Blocks['esp_wifi_scan_count'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📶 Количество Wi-Fi сетей", "📶 Number of Wi-Fi Networks"));
        this.setOutput(true, "Number");
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Получить количество обнаруженных Wi-Fi сетей",
            "Get number of detected Wi-Fi networks"
        ));
    }
};

// Получение информации о конкретной сети Wi-Fi
Blockly.Blocks['esp_wifi_network_info'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📶 Информация о Wi-Fi сети", "📶 Wi-Fi Network Info"))
            .appendField(getBlockText("Индекс", "Index"))
            .appendField(new Blockly.FieldNumber(0, 0, 20, 1), "INDEX");
        this.setOutput(true, "String");
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Получить информацию о сети по индексу [SSID, RSSI, канал, шифрование]",
            "Get network info by index [SSID, RSSI, channel, encryption]"
        ));
    }
};

// MQTT keep alive интервал
Blockly.Blocks['esp_mqtt_keepalive'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("📡 MQTT Keep Alive", "📡 MQTT Keep Alive"))
            .appendField(getBlockText("Интервал (сек)", "Interval (sec)"))
            .appendField(new Blockly.FieldNumber(60, 15, 65535, 5), "INTERVAL");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText(
            "Установить интервал keep alive для поддержания MQTT соединения",
            "Set keep alive interval to maintain MQTT connection"
        ));
    }
};