class SensorHelperProvider extends BaseHelperProvider {
    constructor() {
        super();

        this.helperMap = {
            'sensor_ultrasonic': this.generateUltrasonicHelper,
            'sensor_tcs3472': this.generateColorSensorHelper,
            'ds18b20_begin': this.generateDS18B20Helper,
            'ds18b20_read_temp': this.generateDS18B20Helper,
            'dht_begin': this.generateDHTHelpers,
            'dht_read_temperature': this.generateDHTHelpers,
            'dht_read_humidity': this.generateDHTHelpers,
            'dht_compute_heat_index': this.generateDHTHelpers,
            'dht_read_all': this.generateDHTHelpers,
            'encoder_begin': this.generateEncoderHelper,
            'encoder_read': this.generateEncoderHelper
        };
    }

    generateUltrasonicHelper = () => {
        return `
long readUltrasonic(int trigPin, int echoPin) {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration / 58;
}
`;
    }

    generateColorSensorHelper = () => {
        return `
String getColorName() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  if (r > g && r > b) return "RED";
  if (g > r && g > b) return "GREEN";
  if (b > r && b > g) return "BLUE";
  if (r < 100 && g < 100 && b < 100) return "BLACK";
  if (r > 200 && g > 200 && b > 200) return "WHITE";

  return "UNKNOWN";
}
`;
    }

    generateDS18B20Helper = () => {
        return `
float readDS18B20Temp() {
  sensors.requestTemperatures();
  return sensors.getTempCByIndex(0);
}
`;
    }

    generateDHTHelpers = () => {
        return `
// ===== DHT ХЕЛПЕРЫ =====
String readDHTAll() {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
        return "Error reading DHT";
    }

    return String(temperature) + "," + String(humidity);
}
`;
    }

    generateEncoderHelper = () => {
        return `
volatile long encoderValue = 0;
volatile int encoderCLK = 2;
volatile int encoderDT = 3;

void updateEncoder() {
  int CLK = digitalRead(encoderCLK);
  int DT = digitalRead(encoderDT);

  if (CLK == DT) {
    encoderValue++;
  } else {
    encoderValue--;
  }
}

long readEncoder() {
  return encoderValue;
}
`;
    }
}