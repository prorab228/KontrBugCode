class SpecialParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'eeprom_write': this.parseEEPROMWrite,
            'eeprom_read': this.parseEEPROMRead,
            'rtc_begin': this.parseRTCBegin,
            'rtc_set_datetime': this.parseRTCSetDateTime,
            'rtc_read_date': this.parseRTCReadDate,
            'rtc_read_time': this.parseRTCReadTime,
            'rtc_read_weekday': this.parseRTCReadWeekday,
            'buzzer_beep': this.parseBuzzerBeep,
            'buzzer_note': this.parseBuzzerNote,
            'buzzer_melody': this.parseBuzzerMelody,
            'buzzer_stop': this.parseBuzzerStop,
            'interrupt_attach': this.parseInterruptAttach,
            'interrupt_detach': this.parseInterruptDetach,
            'time_seconds': this.parseTimeSeconds,
            'time_after_seconds': this.parseTimeAfterSeconds,
            'math_arithmetic': this.parseMathArithmetic,
            'math_random': this.parseRandom,
            'math_modulo': this.parseModulo,
            'math_divisible': this.parseDivisible,
            'logic_compare': this.parseLogicCompare,
            'logic_operation': this.parseLogicOperation,
            'logic_negate': this.parseLogicNegate,
            'text_join': this.parseTextJoin,
            'text_length': this.parseTextLength,
            'text_convert_to_string': this.parseTextConvertToString,
            'text_start_with': this.parseTextStartWith
        };
    }

    parseEEPROMWrite = (block, parser) => {
        try {
            const address = block.getFieldValue('ADDRESS') || '0';
            const dataBlock = block.getInputTargetBlock('DATA');
            const data = dataBlock ? parser.parseExpression(dataBlock) : '0';
            return `EEPROM.write(${address}, ${data});`;
        } catch (error) {
            return '// Ошибка записи в EEPROM';
        }
    }

    parseEEPROMRead = (block, parser) => {
        try {
            const address = block.getFieldValue('ADDRESS') || '0';
            return `EEPROM.read(${address})`;
        } catch (error) {
            return '0';
        }
    }

    parseRTCBegin = (block, parser) => {
        const module = block.getFieldValue('MODULE') || 'DS1302';

        if (module === 'DS1302') {
            const rstPin = this.getPinFromBlock(block, 'RST_PIN', '6');
            const datPin = this.getPinFromBlock(block, 'DAT_PIN', '7');
            const clkPin = this.getPinFromBlock(block, 'CLK_PIN', '8');
            return `rtc.begin(); // Модуль: ${module}, Пины: RST=${rstPin}, DAT=${datPin}, CLK=${clkPin}`;
        } else {
            return `rtc.begin(); // Модуль: ${module}, I2C (SDA=A4, SCL=A5)`;
        }
    }

    parseRTCSetDateTime = (block, parser) => {
        const year = block.getFieldValue('YEAR') || '2024';
        const month = block.getFieldValue('MONTH') || '1';
        const day = block.getFieldValue('DAY') || '1';
        const hour = block.getFieldValue('HOUR') || '0';
        const minute = block.getFieldValue('MINUTE') || '0';
        const second = block.getFieldValue('SECOND') || '0';
        return `rtc.settime(${second}, ${minute}, ${hour}, ${day}, ${month}, ${year});`;
    }

    parseRTCReadDate = () => {
        return 'rtc.gettime("d-m-Y");';
    }

    parseRTCReadTime = () => {
        return 'rtc.gettime("H:i:s");';
    }

    parseRTCReadWeekday = () => {
        return 'rtc.gettime("D");';
    }

    parseBuzzerBeep = (block, parser) => {
        try {
            const pin = this.getPinFromBlock(block, 'PIN', '8');
            const frequency = block.getFieldValue('FREQUENCY') || '1000';
            const duration = block.getFieldValue('DURATION') || '1000';
            return `tone(${pin}, ${frequency}, ${duration});`;
        } catch (error) {
            return '// Ошибка управления зуммером';
        }
    }

    parseBuzzerNote = (block, parser) => {
        const pin = this.getPinFromBlock(block, 'PIN');
        const note = block.getFieldValue('NOTE') || '262';
        const durationBlock = block.getInputTargetBlock('DURATION');
        const duration = durationBlock ? parser.parseExpression(durationBlock) : '1000';
        return `tone(${pin}, ${note}, ${duration});`;
    }

    parseBuzzerMelody = (block, parser) => {
        const pin = this.getPinFromBlock(block, 'PIN');
        const notesBlock = block.getInputTargetBlock('NOTES');
        const durationsBlock = block.getInputTargetBlock('DURATIONS');
        const notes = notesBlock ? parser.parseExpression(notesBlock) : '[]';
        const durations = durationsBlock ? parser.parseExpression(durationsBlock) : '[]';
        return `playMelody(${pin}, ${notes}, ${durations});`;
    }

    parseBuzzerStop = (block, parser) => {
        const pin = this.getPinFromBlock(block, 'PIN');
        return `noTone(${pin});`;
    }

    parseInterruptAttach = (block, parser) => {
        try {
            const pin = this.getPinFromBlock(block, 'PIN', '2');
            const mode = block.getFieldValue('MODE') || 'RISING';
            const doBlocks = parser.parseStatementBlock(block, 'DO');

            const functionName = `handleInterrupt${pin}`;

            let code = `void ${functionName}() {\n`;
            code += doBlocks.map(line => `  ${line}`).join('\n');
            code += `\n}\n`;
            code += `attachInterrupt(digitalPinToInterrupt(${pin}), ${functionName}, ${mode});`;

            parser.addGlobalVar(code);
            return `// Прерывание на пине ${pin}`;
        } catch (error) {
            return '// Ошибка настройки прерывания';
        }
    }

    parseInterruptDetach = (block, parser) => {
        try {
            const pin = this.getPinFromBlock(block, 'PIN', '2');
            return `detachInterrupt(digitalPinToInterrupt(${pin}));`;
        } catch (error) {
            return '// Ошибка отключения прерывания';
        }
    }

    parseTimeSeconds = () => {
        return 'millis() / 1000';
    }

    parseTimeAfterSeconds = (block, parser) => {
        try {
            const secondsBlock = block.getInputTargetBlock('SECONDS');
            const seconds = secondsBlock ? parser.parseExpression(secondsBlock) : '1';
            const doBlocks = parser.parseStatementBlock(block, 'DO');

            const taskName = `timer_${Math.random().toString(36).substr(2, 5)}`;

            let code = `static unsigned long ${taskName}_startTime = millis();\n`;
            code += `if (millis() - ${taskName}_startTime >= (${seconds} * 1000UL)) {\n`;
            code += doBlocks.map(line => `  ${line}`).join('\n');
            code += `\n  ${taskName}_startTime = millis();\n}`;

            return code;
        } catch (error) {
            return '// Ошибка парсинга таймера';
        }
    }

    parseMathArithmetic = (block, parser) => {
        const aBlock = block.getInputTargetBlock('A');
        const bBlock = block.getInputTargetBlock('B');
        const op = block.getFieldValue('OP');
        const a = aBlock ? parser.parseExpression(aBlock) : '0';
        const b = bBlock ? parser.parseExpression(bBlock) : '0';
        const operators = {
            'ADD': '+', 'MINUS': '-', 'MULTIPLY': '*', 'DIVIDE': '/'
        };
        return `(${a} ${operators[op] || '+'} ${b})`;
    }

    parseRandom = (block, parser) => {
        try {
            const from = block.getFieldValue('FROM') || '0';
            const to = block.getFieldValue('TO') || '100';
            return `random(${from}, ${to})`;
        } catch (error) {
            return 'random(0, 100)';
        }
    }

    parseModulo = (block, parser) => {
        try {
            const aBlock = block.getInputTargetBlock('A');
            const bBlock = block.getInputTargetBlock('B');
            const a = aBlock ? parser.parseExpression(aBlock) : '0';
            const b = bBlock ? parser.parseExpression(bBlock) : '1';
            return `(${a} % ${b})`;
        } catch (error) {
            return '(0 % 1)';
        }
    }

    parseDivisible = (block, parser) => {
        try {
            const aBlock = block.getInputTargetBlock('A');
            const bBlock = block.getInputTargetBlock('B');
            const a = aBlock ? parser.parseExpression(aBlock) : '0';
            const b = bBlock ? parser.parseExpression(bBlock) : '1';
            return `(${a} % ${b} == 0)`;
        } catch (error) {
            return '(0 % 1 == 0)';
        }
    }

    parseLogicCompare = (block, parser) => {
        try {
            const compA = parser.parseExpression(block.getInputTargetBlock('A'));
            const compB = parser.parseExpression(block.getInputTargetBlock('B'));
            const compOp = block.getFieldValue('OP');
            const compOperators = {
                'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>='
            };
            return `(${compA} ${compOperators[compOp] || '=='} ${compB})`;
        } catch (error) {
            return '(false == false)';
        }
    }

    parseLogicOperation = (block, parser) => {
        try {
            const logicA = parser.parseExpression(block.getInputTargetBlock('A'));
            const logicB = parser.parseExpression(block.getInputTargetBlock('B'));
            const logicOp = block.getFieldValue('OP');
            const logicOperators = {
                'AND': '&&', 'OR': '||'
            };
            return `(${logicA} ${logicOperators[logicOp] || '&&'} ${logicB})`;
        } catch (error) {
            return '(false && false)';
        }
    }

    parseLogicNegate = (block, parser) => {
        try {
            const valueBlock = block.getInputTargetBlock('BOOL');
            const value = valueBlock ? parser.parseExpression(valueBlock) : 'false';
            return `!(${value})`;
        } catch (error) {
            return '!false';
        }
    }

    parseTextJoin = (block, parser) => {
        try {
            const text1Block = block.getInputTargetBlock('TEXT1');
            const text2Block = block.getInputTargetBlock('TEXT2');
            const text1 = text1Block ? parser.parseExpression(text1Block) : '""';
            const text2 = text2Block ? parser.parseExpression(text2Block) : '""';
            return `String(${text1}) + String(${text2})`;
        } catch (error) {
            return '"" + ""';
        }
    }

    parseTextLength = (block, parser) => {
        try {
            const textBlock = block.getInputTargetBlock('TEXT');
            const text = textBlock ? parser.parseExpression(textBlock) : '""';
            return `String(${text}).length()`;
        } catch (error) {
            return '0';
        }
    }

    parseTextConvertToString = (block, parser) => {
        try {
            const valueBlock = block.getInputTargetBlock('VALUE');
            const value = valueBlock ? parser.parseExpression(valueBlock) : '""';
            return `String(${value})`;
        } catch (error) {
            return 'String("")';
        }
    }

    parseTextStartWith = (block, parser) => {
        try {
            const command = block.getFieldValue('COMMAND') || 'command';
            const dataBlock = block.getInputTargetBlock('DATA');
            const data = dataBlock ? parser.parseExpression(dataBlock) : '""';
            return `${data}.startsWith("${command}")`;
        } catch (error) {
            return '// Ошибка разбора команды';
        }
    }
}