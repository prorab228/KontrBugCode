class BasicParser extends BaseParser {
    constructor() {
        super();

        // Определяем methodMap как свойство класса
        this.methodMap = {
            // Basic blocks
            'digital_write': this.parseDigitalWrite,
            'analog_write': this.parseAnalogWrite,
            'delay': this.parseDelay,
            'pin_mode': this.parsePinMode,

            // Variables
            'variables_declare': this.parseVariableDeclare,
            'variables_set': this.parseVariableSet,
            'variables_get': this.parseVariableGet,

            // Control structures
            'controls_if': (block, parser) => parser.parseConditionChainSmart(block),
            'controls_else_if': (block, parser) => parser.parseConditionChainSmart(block),
            'controls_else': (block, parser) => parser.parseConditionChainSmart(block),
            'controls_whileUntil': this.parseWhileUntil,
            'controls_for': this.parseForLoop,
            'controls_repeat_times': this.parseRepeatTimes,
            'controls_while': this.parseWhile,

            // Math and text
            'math_number': this.parseMathNumber,
            'text': this.parseText,
            'logic_boolean': this.parseLogicBoolean,

            // System
            'system_reset': this.parseSystemReset
        };
    }


    // Привязываем контекст this для методов
    parseDigitalWrite = (block) => {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE');
        return `digitalWrite(${pin}, ${state});`;
    }

    parseAnalogWrite = (block, parser) => {
        const pin = block.getFieldValue('PIN');
        const valueBlock = block.getInputTargetBlock('VALUE');
        const value = valueBlock ? parser.parseExpression(valueBlock) : '0';
        return `analogWrite(${pin}, ${value});`;
    }

    parseDelay = (block) => {
        const time = block.getFieldValue('TIME');
        return `delay(${time});`;
    }

    parsePinMode = (block) => {
        const pin = block.getFieldValue('PIN');
        const mode = block.getFieldValue('MODE');
        return `pinMode(${pin}, ${mode});`;
    }

    parseVariableDeclare = (block, parser) => {
        try {
            const varType = block.getFieldValue('TYPE');
            let varName = this.cleanVariableName(block.getFieldValue('VAR'));
            const valueBlock = block.getInputTargetBlock('VALUE');
            const value = valueBlock ? parser.parseExpression(valueBlock) : this.getDefaultValue(varType);
            return `${varType} ${varName} = ${value};`;
        } catch (error) {
            return '// Ошибка парсинга переменной';
        }
    }

    parseVariableSet = (block, parser) => {
        try {
            let varName = this.cleanVariableName(block.getFieldValue('VAR'));
            const valueBlock = block.getInputTargetBlock('VALUE');
            const value = valueBlock ? parser.parseExpression(valueBlock) : '0';
            return `${varName} = ${value};`;
        } catch (error) {
            return '// Ошибка парсинга установки переменной';
        }
    }

    parseVariableGet = (block) => {
        let varName = this.cleanVariableName(block.getFieldValue('VAR'));
        return varName || 'variable';
    }

    parseWhileUntil = (block, parser) => {
        try {
            const conditionBlock = block.getInputTargetBlock('BOOL');
            const condition = conditionBlock ? parser.parseExpression(conditionBlock) : 'false';
            const doBlocks = parser.parseStatementBlock(block, 'DO');

            let code = `while (${condition}) {\n`;
            code += doBlocks.map(line => `  ${line}`).join('\n');
            code += '\n}';
            return code;
        } catch (error) {
            return '// Ошибка парсинга цикла while';
        }
    }

    parseForLoop = (block, parser) => {
        try {
            let varName = this.cleanVariableName(block.getFieldValue('VAR') || 'i');
            const from = block.getFieldValue('FROM') || '0';
            const to = block.getFieldValue('TO') || '10';
            const step = block.getFieldValue('STEP') || '1';
            const doBlocks = parser.parseStatementBlock(block, 'DO');

            let code = `for (int ${varName} = ${from}; ${varName} < ${to}; ${varName} += ${step}) {\n`;
            code += doBlocks.map(line => `  ${line}`).join('\n');
            code += '\n}';
            return code;
        } catch (error) {
            return '// Ошибка парсинга цикла for';
        }
    }

    parseRepeatTimes = (block, parser) => {
        try {
            const timesBlock = block.getInputTargetBlock('TIMES');
            const times = timesBlock ? parser.parseExpression(timesBlock) : '10';
            const doBlocks = parser.parseStatementBlock(block, 'DO');

            let code = `for (int i = 0; i < ${times}; i++) {\n`;
            code += doBlocks.map(line => `  ${line}`).join('\n');
            code += '\n}';
            return code;
        } catch (error) {
            return '// Ошибка парсинга цикла повторения';
        }
    }

    parseWhile = this.parseWhileUntil;

    parseMathNumber = (block) => {
        return block.getFieldValue('NUM') || '0';
    }

    parseText = (block) => {
        return `"${block.getFieldValue('TEXT') || ''}"`;
    }

    parseLogicBoolean = (block) => {
        return block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false';
    }

    parseSystemReset = () => {
        return 'resetFunc();';
    }

    getDefaultValue(type) {
        const defaults = {
            'int': '0',
            'float': '0.0',
            'bool': 'false',
            'String': '""'
        };
        return defaults[type] || '0';
    }
}