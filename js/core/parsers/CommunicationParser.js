class CommunicationParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'bluetooth_begin': this.parseBluetoothBegin,
            'bluetooth_send': this.parseBluetoothSend,
            'bluetooth_receive': this.parseBluetoothReceive,
            'bluetooth_available': this.parseBluetoothAvailable,
            'serial_begin': this.parseSerialBegin,
            'serial_print': this.parseSerialPrint,
            'serial_println': this.parseSerialPrintln,
            'serial_write': this.parseSerialWrite,
            'serial_set_timeout': this.parseSerialSetTimeout,
            'serial_available': this.parseSerialAvailable,
            'serial_read_string': this.parseSerialReadString,
            'serial_read_number': this.parseSerialReadNumber,
            'serial_read_byte': this.parseSerialReadByte,
            'serial_read_until': this.parseSerialReadUntil,
            'serial_flush': this.parseSerialFlush,
            'serial_wait_data': this.parseSerialWaitData,
            'ir_transmitter_begin': this.parseIRTransmitterBegin,
            'ir_transmitter_send': this.parseIRTransmitterSend,
            'ir_receiver_begin': this.parseIRReceiverBegin,
            'ir_receiver_read': this.parseIRReceiverRead
        };
    }

    parseBluetoothBegin = (block, parser) => {
        try {
            const rxPin = this.getPinFromBlock(block, 'RX_PIN', '10');
            const txPin = this.getPinFromBlock(block, 'TX_PIN', '11');
            const baud = block.getFieldValue('BAUD') || '9600';
            return `BT.begin(${baud}); // RX: ${rxPin}, TX: ${txPin}`;
        } catch (error) {
            return 'BT.begin(9600);';
        }
    }

    parseBluetoothSend = (block, parser) => {
        try {
            const dataBlock = block.getInputTargetBlock('DATA');
            const data = dataBlock ? parser.parseExpression(dataBlock) : '""';
            return `BT.println(${data});`;
        } catch (error) {
            return '// Ошибка парсинга Bluetooth';
        }
    }

    parseBluetoothReceive = () => {
        return 'BT.readString()';
    }

    parseBluetoothAvailable = () => {
        return 'BT.available()';
    }

    parseSerialBegin = (block, parser) => {
        try {
            const baud = block.getFieldValue('BAUD') || '9600';
            return `Serial.begin(${baud});`;
        } catch (error) {
            return 'Serial.begin(9600);';
        }
    }

    parseSerialPrint = (block, parser) => {
        try {
            const dataBlock = block.getInputTargetBlock('TEXT');
            const data = dataBlock ? parser.parseExpression(dataBlock) : '""';
            return `Serial.print(${data});`;
        } catch (error) {
            return '// Ошибка парсинга Serial print';
        }
    }

    parseSerialPrintln = (block, parser) => {
        try {
            const dataBlock = block.getInputTargetBlock('TEXT');
            const data = dataBlock ? parser.parseExpression(dataBlock) : '""';
            return `Serial.println(${data});`;
        } catch (error) {
            return 'Serial.println("");';
        }
    }

    parseSerialWrite = (block, parser) => {
        try {
            const byteBlock = block.getInputTargetBlock('BYTE');
            const byteValue = byteBlock ? parser.parseExpression(byteBlock) : '0';
            return `Serial.write(${byteValue});`;
        } catch (error) {
            return 'Serial.write(0);';
        }
    }

    parseSerialSetTimeout = (block, parser) => {
        try {
            const timeout = block.getFieldValue('TIMEOUT') || '1000';
            return `Serial.setTimeout(${timeout});`;
        } catch (error) {
            return 'Serial.setTimeout(1000);';
        }
    }

    parseSerialAvailable = () => {
        return 'Serial.available()';
    }

    parseSerialReadString = () => {
        return 'Serial.readString()';
    }

    parseSerialReadNumber = () => {
        return 'Serial.parseInt()';
    }

    parseSerialReadByte = () => {
        return 'Serial.read()';
    }

    parseSerialReadUntil = (block, parser) => {
        try {
            const terminator = block.getFieldValue('TERMINATOR') || '\\n';
            return `Serial.readStringUntil('${this.unescapeTerminator(terminator)}')`;
        } catch (error) {
            return 'Serial.readStringUntil(\'\\n\')';
        }
    }

    parseSerialFlush = () => {
        return 'Serial.flush();';
    }

    parseSerialWaitData = () => {
        return 'while (!Serial.available()) { delay(10); }';
    }

    parseIRTransmitterBegin = (block, parser) => {
        try {
            const pin = this.getPinFromBlock(block, 'PIN', '3');
            return `// IR transmitter initialized on pin ${pin}`;
        } catch (error) {
            return '// Ошибка инициализации IR передатчика';
        }
    }

    parseIRTransmitterSend = (block, parser) => {
        try {
            const code = block.getFieldValue('CODE') || '0';
            return `irSend.send(${code});`;
        } catch (error) {
            return '// Ошибка отправки IR кода';
        }
    }

    parseIRReceiverBegin = (block, parser) => {
        try {
            const pin = this.getPinFromBlock(block, 'PIN', '2');
            return `irRecv.enableIRIn(); // Pin: ${pin}`;
        } catch (error) {
            return '// Ошибка инициализации IR приемника';
        }
    }

    parseIRReceiverRead = () => {
        return 'irRecv.read()';
    }

    unescapeTerminator = (terminator) => {
        const escapeMap = {
            '\\\\n': '\n',
            '\\\\r': '\r',
            '\\\\t': '\t',
            '\\\\\\\\': '\\',
            '\\\\\'': '\'',
            '\\\\"': '"'
        };

        let result = terminator;
        for (const [escape, real] of Object.entries(escapeMap)) {
            result = result.replace(new RegExp(escape, 'g'), real);
        }

        return result;
    }

    getSensorInitialization = (block) => {
        if (block.type === 'ir_receiver_begin') {
            const pin = this.getPinFromBlock(block, 'PIN', '2');
            return `irRecv.enableIRIn(); // Pin: ${pin}`;
        }
        if (block.type === 'ir_transmitter_begin') {
            return '// IR transmitter initialized';
        }
        return null;
    }
}