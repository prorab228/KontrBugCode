class ESPParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'esp_wifi_begin': this.parseWifiBegin,
            'esp_wifi_connected': this.parseWifiConnected,
            'esp_wifi_ip': this.parseWifiIp,
            'esp_wifi_scan': this.parseWifiScan,
            'esp_wifi_status': this.parseWifiStatus,
            'esp_wifi_scan_count': () => 'WiFi.scanNetworks()',
            'esp_wifi_network_info': this.parseWifiNetworkInfo,
            'esp_http_get': this.parseHttpGet,
            'esp_http_post': this.parseHttpPost,
            'esp_mqtt_connect': this.parseMQTTConnect,
            'esp_mqtt_publish': this.parseMQTTPublish,
            'esp_mqtt_subscribe': this.parseMQTTSubscribe,
            'esp_mqtt_receive': this.parseMQTTReceive,
            'esp_mqtt_connected': this.parseMQTTConnected,
            'esp_mqtt_disconnect': this.parseMQTTDisconnect,
            'esp_mqtt_last_will': this.parseMQTTLastWill,
            'esp_mqtt_reconnect': this.parseMQTTReconnect,
            'esp_mqtt_keepalive': this.parseMQTTKeepAlive,
            'esp_webserver_begin': this.parseWebServerBegin,
            'esp_webserver_handle': this.parseWebServerHandle,
            'esp_ntp_time': this.parseNtpTime,
            'esp_ntp_date': this.parseNtpDate,
            'esp_ntp_set_time_zone': this.parseNtpSetTimeZone,
            'esp_deep_sleep': this.parseDeepSleep,
            'esp32_touch_read': this.parseTouchRead
        };
    }

    parseWifiBegin = (block, parser) => {
        const ssid = block.getFieldValue('SSID') || '""';
        const password = block.getFieldValue('PASSWORD') || '""';
        return `setupWiFi("${ssid}", "${password}");`;
    }

    parseWifiConnected = () => {
        return 'WiFi.status() == WL_CONNECTED';
    }

    parseWifiIp = () => {
        return 'WiFi.localIP().toString()';
    }

    parseWifiScan = () => {
        return 'scanWiFi()';
    }

    parseWifiStatus = () => {
        return 'getWiFiStatus()';
    }

    parseWifiNetworkInfo = (block, parser) => {
        try {
            const index = block.getFieldValue('INDEX') || '0';
            return `getWiFiNetworkInfo(${index})`;
        } catch (error) {
            return 'getWiFiNetworkInfo(0)';
        }
    }

    parseHttpGet = (block, parser) => {
        const url = block.getFieldValue('URL') || '"http://example.com"';
        return `httpGETRequest("${url}")`;
    }

    parseHttpPost = (block, parser) => {
        const url = block.getFieldValue('URL') || '"http://example.com"';
        const dataBlock = block.getInputTargetBlock('DATA');
        const data = dataBlock ? parser.parseExpression(dataBlock) : '""';
        return `httpPOSTRequest("${url}", "${data}")`;
    }

    parseMQTTConnect = (block, parser) => {
        try {
            const server = block.getFieldValue('SERVER') || 'test.mosquitto.org';
            const port = block.getFieldValue('PORT') || '1883';
            const user = block.getFieldValue('USER') || '';
            const password = block.getFieldValue('PASSWORD') || '';
            const clientId = block.getFieldValue('CLIENT') || 'ESP8266';

            return `mqttConnect("${server}", ${port}, "${clientId}", "${user}", "${password}", 5000);` +
                   `  // Настройка MQTT подключения\n` +
                   `  mqttClient.setCallback(mqttCallback);`;
        } catch (error) {
            return '// Ошибка настройки MQTT подключения';
        }
    }

    parseMQTTPublish = (block, parser) => {
        try {
            const topic = block.getFieldValue('TOPIC') || '"home/sensor"';
            const messageBlock = block.getInputTargetBlock('MESSAGE');
            const message = messageBlock ? parser.parseExpression(messageBlock) : '""';

            return `if (mqttClient.connected()) {\n` +
                   `    mqttClient.publish("${topic}",${message});\n` +
                   `  }`;
        } catch (error) {
            return '// Ошибка отправки MQTT сообщения';
        }
    }

    parseMQTTSubscribe = (block, parser) => {
        try {
            const topic = block.getFieldValue('TOPIC') || '"home/command"';
            const qos = block.getFieldValue('QOS') === 'HIGH' ? '1' : '0';

            return `if (mqttClient.connected()) {\n` +
                   `    mqttClient.subscribe("${topic}", ${qos});\n` +
                   `  }`;
        } catch (error) {
            return '// Ошибка подписки MQTT';
        }
    }

    parseMQTTReceive = (block, parser) => {
        try {
            const topic = block.getFieldValue('TOPIC') || '';
            return `mqttReceive("${topic}")`;
        } catch (error) {
            return '""';
        }
    }

    parseMQTTConnected = () => {
        return 'mqttClient.connected()';
    }

    parseMQTTDisconnect = () => {
        return 'mqttClient.disconnect();';
    }

    parseMQTTLastWill = (block, parser) => {
        try {
            const topic = block.getFieldValue('TOPIC') || '"device/status"';
            const message = block.getFieldValue('MESSAGE') || '"offline"';
            const qos = block.getFieldValue('QOS') || '0';
            const retain = block.getFieldValue('RETAIN') === 'true' ? 'true' : 'false';

            return `mqttClient.setWill(${topic}, ${message}, ${qos.toUpperCase()}, ${retain});`;
        } catch (error) {
            return '// Ошибка настройки Last Will';
        }
    }

    parseMQTTReconnect = () => {
        return 'mqttReconnect(5000);';
    }

    parseMQTTKeepAlive = (block, parser) => {
        try {
            const interval = block.getFieldValue('INTERVAL') || '60';
            return `mqttClient.setKeepAlive(${interval});`;
        } catch (error) {
            return 'mqttClient.setKeepAlive(60);';
        }
    }

    parseWebServerBegin = (block, parser) => {
        return `setupWebServer();`;
    }

    parseWebServerHandle = () => {
        return 'handleWebClients();';
    }

    parseNtpTime = () => {
        return 'getNTPTime()';
    }

    parseNtpDate = () => {
        return 'getNTPDate()';
    }

    parseNtpSetTimeZone = (block, parser) => {
        try {
            const timezone = block.getFieldValue('TIMEZONE') || '0';
            return `timeClient.setTimeOffset(${timezone * 3600});`;
        } catch (error) {
            return 'timeClient.setTimeOffset(0);';
        }
    }

    parseDeepSleep = (block, parser) => {
        const seconds = block.getFieldValue('SECONDS') || '30';
        return `ESP.deepSleep(${seconds} * 1000000);`;
    }

    parseTouchRead = (block, parser) => {
        const pin = block.getFieldValue('PIN') || 'T0';
        return `touchRead(${pin})`;
    }
}