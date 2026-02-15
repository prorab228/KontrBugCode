class ESPHelperProvider extends BaseHelperProvider {
    constructor() {
        super();

        this.helperMap = {
            'esp_wifi_begin': this.generateESPWifiHelpers,
            'esp_http_get': this.generateESPHTTPHelpers,
            'esp_http_post': this.generateESPHTTPHelpers,
            'esp_mqtt_connect': this.generateESPMQTTHelpers,
            'esp_mqtt_publish': this.generateESPMQTTHelpers,
            'esp_deep_sleep': this.generateESPDeepSleepHelper,
            'esp32_touch_read': this.generateESP32TouchHelper,
            'esp_wifi_scan': this.generateWifiScanHelpers,
            'esp_wifi_status': this.generateWifiStatusHelpers,
            'esp_mqtt_connected': this.generateESPMQTTHelpers,
            'esp_mqtt_disconnect': this.generateESPMQTTHelpers,
            'esp_mqtt_last_will': this.generateESPMQTTHelpers,
            'esp_mqtt_reconnect': this.generateESPMQTTHelpers,
            'esp_wifi_network_info': this.generateWifiNetworkInfoHelpers,
            'esp_mqtt_keepalive': this.generateESPMQTTHelpers,
            'esp_mqtt_subscribe': this.generateESPMQTTHelpers,
            'esp_mqtt_callback': this.generateESPMQTTHelpers,
            'esp_webserver_begin': this.generateESPWebServerHelpers,
            'esp_webserver_handle': this.generateESPWebServerHelpers,
            'esp_ntp_time': this.generateESPNTPHelpers
        };
    }


    generateWifiScanHelpers = () =>
    {
        return `
String scanWiFi() {
int n = WiFi.scanNetworks();
String result = "";

for (int i = 0; i < n; i++) {
    if (i > 0) result += ",\\n";
    result += "{ssid:" + WiFi.SSID(i) + ",";
    result += "rssi:" + String(WiFi.RSSI(i)) + ",";
    result += "channel:" + String(WiFi.channel(i)) + ",";
    result += "encryption:" + String(WiFi.encryptionType(i)) + "}";
}

return result;
}`
}

generateWifiNetworkInfoHelpers = () =>
    {
        return `
String getWiFiNetworkInfo(int index) {
    int n = WiFi.scanNetworks();
    if (index < 0 || index >= n) {
        return "[]";
    }

    String info = "[";
    info += "\\"" + WiFi.SSID(index) + "\\",";
    info += String(WiFi.RSSI(index)) + ",";
    info += String(WiFi.channel(index)) + ",";
    info += String(WiFi.encryptionType(index));
    info += "]";

    return info;
}`
    }

    generateWifiStatusHelpers = () =>
    {
        return `
String getWiFiStatus() {
    switch(WiFi.status()) {
        case WL_CONNECTED: return "Connected";
        case WL_NO_SHIELD: return "No shield";
        case WL_IDLE_STATUS: return "Idle";
        case WL_NO_SSID_AVAIL: return "No SSID available";
        case WL_SCAN_COMPLETED: return "Scan completed";
        case WL_CONNECT_FAILED: return "Connect failed";
        case WL_CONNECTION_LOST: return "Connection lost";
        case WL_DISCONNECTED: return "Disconnected";
        default: return "Unknown";
    }
}`
    }

    generateESPWifiHelpers = () => {
        return `
void setupWiFi(const char* ssid, const char* password) {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
}

`;
    }



    generateESPHTTPHelpers = () => {
        return `
String httpGETRequest(const char* serverName) {
  WiFiClient client;
  HTTPClient http;
  http.begin(client, serverName);
  int httpResponseCode = http.GET();
  String payload = "{}";
  if (httpResponseCode > 0) {
    payload = http.getString();
  }
  http.end();
  return payload;
}

String httpPOSTRequest(const char* serverName, String data) {
  WiFiClient client;
  HTTPClient http;
  http.begin(client, serverName);
  http.addHeader("Content-Type", "application/json");
  int httpResponseCode = http.POST(data);
  String payload = "{}";
  if (httpResponseCode > 0) {
    payload = http.getString();
  }
  http.end();
  return payload;
}
`;
    }

    generateESPMQTTHelpers = () => {
        return `
// ===== MQTT ХЕЛПЕРЫ =====

// Функция подключения к MQTT
bool mqttConnect(const char* server, int port, const char* clientId,
                 const char* user, const char* password, int timeout = 5000) {
  mqttClient.setServer(server, port);

  unsigned long startTime = millis();
  while (!mqttClient.connected() && millis() - startTime < timeout) {
    if (mqttClient.connect(clientId, user, password)) {
      Serial.println("MQTT подключен");
      return true;
    }
    delay(500);
  }
  return mqttClient.connected();
}

// Функция проверки соединения
bool isMQTTConnected() {
    return mqttClient.connected();
}

// Функция отправки сообщения
bool mqttPublish(const char* topic, const char* message, bool retained = false) {
  if (mqttClient.connected()) {
    return mqttClient.publish(topic, message, retained);
  }
  return false;
}

// Функция подписки
bool mqttSubscribe(const char* topic, int qos = 0) {
  if (mqttClient.connected()) {
    return mqttClient.subscribe(topic, qos);
  }
  return false;
}

// Функция получения сообщения
String mqttReceive(const char* topic) {
  if (mqtt_last_topic == topic) {
    String msg = mqtt_last_message;
    mqtt_last_topic = "";
    mqtt_last_message = "";
    return msg;
  }
  return "";
}

// Callback по умолчанию (можно переопределить)
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  mqtt_last_topic = String(topic);
  mqtt_last_message = "";
  for (int i = 0; i < length; i++) {
    mqtt_last_message += (char)payload[i];
  }
  Serial.print("Получено MQTT: ");
  Serial.print(mqtt_last_topic);
  Serial.print(" -> ");
  Serial.println(mqtt_last_message);
}
`;
    }

    generateESPWebServerHelpers = () => {
        return `
// ===== WEB SERVER ХЕЛПЕРЫ =====
#include <ESP8266WebServer.h>
ESP8266WebServer server(80);

// Стандартные маршруты
void handleRoot() {
  server.send(200, "text/html",
    "<h1>ESP Web Server</h1>"
    "<p>Работает на КонтрБагКОД</p>");
}

void handleNotFound() {
  server.send(404, "text/plain", "Страница не найдена");
}

// Инициализация сервера
void setupWebServer(int port = 80) {
  server.on("/", handleRoot);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("HTTP сервер запущен");
}

// Обработка клиентов
void handleWebClients() {
  server.handleClient();
}
`;
    }

    generateESPNTPHelpers = () => {
        return `
// ===== NTP ХЕЛПЕРЫ =====

// Инициализация NTP
void setupNTP() {
  timeClient.begin();
  timeClient.update();
}

// Получение времени
String getNTPTime() {
  timeClient.update();
  return timeClient.getFormattedTime();
}

String getNTPDate() {
  timeClient.update();
    time_t rawtime = timeClient.getEpochTime();
    struct tm * ti;
    ti = localtime(&rawtime);

    char buffer[20];
    sprintf(buffer, "%02d.%02d.%04d", ti->tm_mday, ti->tm_mon + 1, ti->tm_year + 1900);
    return String(buffer);
}
`;
    }

    generateESPDeepSleepHelper = () => {
        return `
// Deep Sleep helper
void setupDeepSleep() {
  // Настройка deep sleep
}
`;
    }

    generateESP32TouchHelper = () => {
        return `
// ESP32 Touch sensor helper
int readTouchSensor(int pin) {
  return touchRead(pin);
}
`;
    }
}