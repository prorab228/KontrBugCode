class ESPLibraryProvider extends BaseLibraryProvider {
    constructor() {
        super();

        this.libraryMap = {
            'esp_wifi_begin': {
                includes: ['#include <ESP8266WiFi.h>']
            },
            'esp_http_get': {
                includes: ['#include <ESP8266HTTPClient.h>', '#include <WiFiClient.h>']
            },
            'esp_http_post': {
                includes: ['#include <ESP8266HTTPClient.h>', '#include <WiFiClient.h>']
            },
            'esp_mqtt_connect': {
                includes: [
                    '#include <ESP8266WiFi.h>',
                    '#include <PubSubClient.h>'
                ],
                declarations: [
                    'WiFiClient espClient;',
                    'PubSubClient mqttClient(espClient);',
                    'String mqtt_last_topic = "";',
                    'String mqtt_last_message = "";'
                ]
            },
            'esp_mqtt_publish': {
                includes: [
                    '#include <ESP8266WiFi.h>',
                    '#include <PubSubClient.h>'
                ],
                declarations: [
                    'WiFiClient espClient;',
                    'PubSubClient mqttClient(espClient);'
                ]
            },
            'esp_mqtt_subscribe': {
                includes: [
                    '#include <ESP8266WiFi.h>',
                    '#include <PubSubClient.h>'
                ],
                declarations: [
                    'WiFiClient espClient;',
                    'PubSubClient mqttClient(espClient);'
                ]
            },
            'esp_webserver_begin': {
                includes: [
                    '#include <ESP8266WiFi.h>',
                    '#include <ESP8266WebServer.h>'
                ],
                declarations: [
                    'ESP8266WebServer server(80);'
                ]
            },
            'esp_ntp_time': {
                includes: [
                    '#include <ESP8266WiFi.h>',
                    '#include <NTPClient.h>',
                    '#include <WiFiUdp.h>'
                ],
                declarations: [
                    'WiFiUDP ntpUDP;',
                    'NTPClient timeClient(ntpUDP, "pool.ntp.org", 10800, 60000);'
                ]
            }
        };
    }
}