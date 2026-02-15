class ESPInitializationProvider extends BaseInitializationProvider {
    constructor() {
        super();

        this.initializationMap = {
          //  'esp_wifi_begin': this.initializeWiFi,
            'esp_mqtt_connect': this.initializeMQTT,
            'esp_webserver_begin': this.initializeWebServer,
            'esp_ntp_time': this.initializeNTP
        };
    }

//    initializeWiFi = (workspace) => {
//        const wifiBlock = workspace?.getAllBlocks(false)
//            .find(b => b.type === 'esp_wifi_begin');
//        if (wifiBlock) {
//            const ssid = wifiBlock.getFieldValue('SSID') || '""';
//            const password = wifiBlock.getFieldValue('PASSWORD') || '""';
//            return [
//                `WiFi.begin(${ssid}, ${password});`,
//                'Serial.print("Подключение к WiFi");',
//                'while (WiFi.status() != WL_CONNECTED) {',
//                '  delay(500);',
//                '  Serial.print(".");',
//                '}',
//                'Serial.println();',
//                'Serial.print("IP адрес: ");',
//                'Serial.println(WiFi.localIP());'
//            ];
//        }
//        return [];
//    }

    initializeMQTT = (workspace) => {
        return ['mqttClient.setCallback(mqttCallback);'];
    }

    initializeWebServer = (workspace) => {
        const portBlock = workspace?.getAllBlocks(false)
            .find(b => b.type === 'esp_webserver_begin');
        if (portBlock) {
            const port = portBlock.getFieldValue('PORT') || '80';
            return [
                `server.begin(${port});`,
                'Serial.println("Web сервер запущен");'
            ];
        }
        return [];
    }

    initializeNTP = (workspace) => {
        return [
            'timeClient.begin();',
            'timeClient.update();'
        ];
    }
}