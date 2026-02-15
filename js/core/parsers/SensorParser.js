class SensorParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'sensor_ultrasonic': this.parseUltrasonic,
            'sensor_ir_obstacle': this.parseDigitalRead,
            'sensor_ir_line': this.parseDigitalRead,
            'sensor_button': this.parseDigitalRead,
            'sensor_sound': this.parseAnalogRead,
            'sensor_vl53lox': this.parseVl53lox,
            'sensor_tcs3472': this.parseTcs3472,
            'analog_read': this.parseAnalogReadDropdown,
            'ds18b20_begin': this.parseDS18B20Begin,
            'ds18b20_read_temp': this.parseDS18B20ReadTemp,
            'dht_begin': this.parseDHTBegin,
            'dht_read_temperature': this.parseDHTReadTemperature,
            'dht_read_humidity': this.parseDHTReadHumidity,
            'dht_compute_heat_index': this.parseDHTComputeHeatIndex,
            'dht_read_all': this.parseDHTReadAll,
            'encoder_begin': this.parseEncoderBegin,
            'encoder_read': this.parseEncoderRead
        };
    }

    parseUltrasonic = (block) => {
        try {
            const trigPin = block.getFieldValue('TRIG');
            const echoPin = block.getFieldValue('ECHO');
            return `readUltrasonic(${trigPin}, ${echoPin})`;
        } catch (error) {
            return 'readUltrasonic(0, 0)';
        }
    }

    parseDigitalRead = (block) => {
        const pin = block.getFieldValue('PIN');
        return `digitalRead(${pin})`;
    }

    parseAnalogRead = (block) => {
        const pin = block.getFieldValue('PIN');
        return `analogRead(${pin})`;
    }

    parseAnalogReadDropdown = (block) => {
        const pin = block.getFieldValue('PIN') || 'A0';
        return `analogRead(${pin})`;
    }

    parseVl53lox = () => {
        return 'sensor.readRangeSingleMillimeters()';
    }

    parseTcs3472 = () => {
        return 'getColorName()';
    }

    parseDS18B20Begin = (block, parser) => {
        try {
            const pin = this.getPinFromBlock(block, 'PIN', '2');
            return `sensors.begin(); // Pin: ${pin}`;
        } catch (error) {
            return '// Ошибка инициализации DS18B20';
        }
    }

    parseDS18B20ReadTemp = () => {
        return 'readDS18B20Temp()';
    }

    parseDHTBegin = (block, parser) => {
        try {
            const type = block.getFieldValue('TYPE') || 'DHT11';
            const pin = this.getPinFromBlock(block, 'PIN', '2');
            return `dht.begin();`;
        } catch (error) {
            return '// Ошибка инициализации DHT';
        }
    }

    parseDHTReadTemperature = (block) => {
        try {
            const unit = block.getFieldValue('UNIT') || 'C';
            if (unit === 'F') {
                return 'dht.readTemperature(true)';
            }
            return 'dht.readTemperature()';
        } catch (error) {
            return '0.0';
        }
    }

    parseDHTReadHumidity = () => {
        return 'dht.readHumidity()';
    }

    parseDHTComputeHeatIndex = (block) => {
        try {
            const unit = block.getFieldValue('UNIT') || 'C';
            const isFahrenheit = unit === 'F';
            return `dht.computeHeatIndex(${isFahrenheit})`;
        } catch (error) {
            return '0.0';
        }
    }

    parseDHTReadAll = () => {
        return 'readDHTAll()';
    }

    parseEncoderBegin = (block, parser) => {
        try {
            const clk = this.getPinFromBlock(block, 'CLK', '2');
            const dt = this.getPinFromBlock(block, 'DT', '3');
            return `pinMode(encoderCLK, INPUT_PULLUP);\n  pinMode(encoderDT, INPUT_PULLUP);\n  attachInterrupt(digitalPinToInterrupt(encoderCLK), updateEncoder, CHANGE);`;
        } catch (error) {
            return '// Ошибка инициализации энкодера';
        }
    }

    parseEncoderRead = () => {
        return 'readEncoder()';
    }

    // Получение инициализации сенсора (если требуется)
    getSensorInitialization(block) {
        const initMap = {
            'sensor_vl53lox': 'sensor.init();\n  sensor.setTimeout(500);',
            'sensor_tcs3472': 'if (!tcs.begin()) {\n    Serial.println("No TCS34725 found!");\n    while (1);\n  }',
            'ds18b20_begin': 'sensors.begin();',
            'encoder_begin': 'pinMode(encoderCLK, INPUT_PULLUP);\n  pinMode(encoderDT, INPUT_PULLUP);\n  attachInterrupt(digitalPinToInterrupt(encoderCLK), updateEncoder, CHANGE);',
            'dht_begin': 'dht.begin();'
        };

        return initMap[block.type] || null;
    }
}