class SensorLibraryProvider extends BaseLibraryProvider {
    constructor() {
        super();

        this.libraryMap = {
            'sensor_vl53lox': {
                includes: ['#include <Wire.h>', '#include <VL53L0X.h>'],
                declarations: ['VL53L0X sensor;']
            },
            'sensor_tcs3472': {
                includes: ['#include <Wire.h>', '#include <Adafruit_TCS34725.h>'],
                declarations: ['Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);']
            },
            'ds18b20_begin': {
                includes: ['#include <OneWire.h>', '#include <DallasTemperature.h>'],
                declarations: [
                    'OneWire oneWire(2); // PIN',
                    'DallasTemperature sensors(&oneWire);'
                ]
            },
            'ds18b20_read_temp': {
                includes: ['#include <OneWire.h>', '#include <DallasTemperature.h>'],
                declarations: [
                    'OneWire oneWire(2); // PIN',
                    'DallasTemperature sensors(&oneWire);'
                ]
            },
            'dht_begin': {
                includes: ['#include <DHT.h>']
            },
            'dht_read_temperature': {
                includes: ['#include <DHT.h>']
            },
            'dht_read_humidity': {
                includes: ['#include <DHT.h>']
            },
            'dht_compute_heat_index': {
                includes: ['#include <DHT.h>']
            },
            'dht_read_all': {
                includes: ['#include <DHT.h>']
            }
        };
    }

    getDynamicConfig(blockType, workspace) {
        const dynamicConfigs = {
            'ds18b20_begin': {
                includes: ['#include <OneWire.h>', '#include <DallasTemperature.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const pin = block.getFieldValue('PIN') || '2';
                        return `OneWire oneWire(${pin});`;
                    },
                    (block) => {
                        return 'DallasTemperature sensors(&oneWire);';
                    }
                ]
            },
            'dht_begin': {
                includes: ['#include <DHT.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const pin = block.getFieldValue('PIN') || '2';
                        const type = block.getFieldValue('TYPE') || 'DHT11';
                        return `DHT dht(${pin}, ${type});`;
                    }
                ]
            }
        };

        return dynamicConfigs[blockType];
    }
}