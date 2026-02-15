class SensorInitializationProvider extends BaseInitializationProvider {
    constructor() {
        super();

        this.initializationMap = {
            'sensor_vl53lox': this.initializeVl53lox,
            'sensor_tcs3472': this.initializeTcs3472,
            'ds18b20_begin': this.initializeDS18B20,
            'encoder_begin': this.initializeEncoder,
            'dht_begin': this.initializeDHT,
            'ir_receiver_begin': this.initializeIRReceiver
        };
    }

    initializeVl53lox = (workspace) => {
        return [
            'sensor.init();',
            'sensor.setTimeout(500);'
        ];
    }

    initializeTcs3472 = (workspace) => {
        return [
            'if (!tcs.begin()) {',
            '  Serial.println("No TCS34725 found!");',
            '  while (1);',
            '}'
        ];
    }

    initializeDS18B20 = (workspace) => {
        return ['sensors.begin();'];
    }

    initializeEncoder = (workspace) => {
        const encoderBlock = workspace?.getAllBlocks(false)
            .find(b => b.type === 'encoder_begin');
        if (encoderBlock) {
            const clk = encoderBlock.getFieldValue('CLK') || '2';
            const dt = encoderBlock.getFieldValue('DT') || '3';
            return [
                `pinMode(${clk}, INPUT_PULLUP);`,
                `pinMode(${dt}, INPUT_PULLUP);`,
                'attachInterrupt(digitalPinToInterrupt(encoderCLK), updateEncoder, CHANGE);'
            ];
        }
        return [];
    }

    initializeDHT = (workspace) => {
        return ['dht.begin();'];
    }

    initializeIRReceiver = (workspace) => {
        const irBlock = workspace?.getAllBlocks(false)
            .find(b => b.type === 'ir_receiver_begin');
        if (irBlock) {
            const pin = irBlock.getFieldValue('PIN') || '2';
            return [`irRecv.begin(${pin});`];
        }
        return ['irRecv.enableIRIn();'];
    }
}