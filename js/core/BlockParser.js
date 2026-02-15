class BlockParser {
    constructor(workspace) {
        this.workspace = workspace;
        this.usedBlockTypes = new Set();
        this.sensorInitializations = new Set();
        this.functions = [];
        this.backgroundTasks = [];
        this.globalVars = [];

        // Инициализируем менеджер парсеров
        this.parserManager = window.ParserManager || new ParserManager();
    }

    parseWorkspace() {
        const blocks = this.workspace.getAllBlocks(false);
        const result = {
            setupCode: [],
            loopCode: [],
            globalVars: [],
            usedBlockTypes: this.usedBlockTypes
        };

        try {
            this.collectBlockInfo(blocks);
            this.processBlocks(blocks, result);
            this.applyPostProcessing(result);
        } catch (error) {
            console.error('Error parsing workspace:', error);
        }

        return result;
    }

    collectBlockInfo(blocks) {
        blocks.forEach(block => {
            if (block?.type) {
                this.usedBlockTypes.add(block.type);
                const initCode = this.parserManager.getSensorInitialization(block);
                if (initCode) {
                    this.sensorInitializations.add(initCode);
                }
            }
        });
    }

    processBlocks(blocks, result) {
        blocks.forEach(block => {
            if (!block?.type) return;

            try {
                this.processSingleBlock(block, result);
            } catch (error) {
                console.error(`Error processing block ${block.type}:`, error);
            }
        });
    }

    // Проверяем, находится ли блок в глобальной области
    isInGlobalScope(block) {
        let currentBlock = block;

        // Поднимаемся вверх по цепочке блоков
        while (currentBlock) {
            const parentType = currentBlock.type;

            // Если нашли родительский блок, который не является глобальным
            if (parentType === 'arduino_setup' ||
                parentType === 'arduino_loop' ||
                parentType === 'function_definition' ||
                parentType === 'background_task' ||
                parentType === 'controls_if' ||
                parentType === 'controls_else_if' ||
                parentType === 'controls_else' ||
                parentType === 'controls_whileUntil' ||
                parentType === 'controls_for' ||
                parentType === 'controls_repeat_times' ||
                parentType === 'controls_while') {
                return false;
            }

            // Переходим к родительскому блоку
            currentBlock = currentBlock.getParent();
        }

        return true; // блок в глобальной области
    }

    processSingleBlock(block, result) {
        const { type } = block;

        switch (type) {
            case 'arduino_setup':
                result.setupCode.push(...this.parseStatementBlock(block, 'SETUP_CODE'));
                break;
            case 'arduino_loop':
                result.loopCode.push(...this.parseStatementBlock(block, 'LOOP_CODE'));
                break;
            case 'variables_declare':
                const variable_code = this.parseBlock(block);
                if (variable_code && this.isInGlobalScope(block)) result.globalVars.push(variable_code);
            case 'array_create':
                const array = this.parseBlock(block);
                if (array && this.isInGlobalScope(block)) result.globalVars.push(array);
            default:
                const code = this.parseBlock(block);
                if (code) {
                    // Разделяем код по назначению
                    if (type === 'function_definition' || type === 'background_task' || type === 'interrupt_attach') {
                        result.globalVars.push(code);
                    } else if (!block.outputConnection && !block.previousConnection && !code.includes('//')) {
                        result.globalVars.push(code);
                    }
                }
        }
    }

    applyPostProcessing(result) {
        // Add sensor initializations to setup
        result.setupCode.push(...Array.from(this.sensorInitializations));

        // Add functions to global variables
        result.globalVars.push(...this.functions);

        // Process background tasks
        this.backgroundTasks.forEach(task => {
            if (task.globalVars) result.globalVars.push(task.globalVars);
            if (task.setupCode) result.setupCode.push(task.setupCode);
            if (task.loopCode) result.loopCode.push(task.loopCode);
        });

        // Add global variables
        result.globalVars.push(...this.globalVars);
    }

    parseStatementBlock(block, inputName) {
        const statements = [];
        try {
            const connection = block.getInput(inputName)?.connection;
            if (!connection) return statements;

            let nextBlock = connection.targetBlock();
            while (nextBlock) {
                const code = this.parseBlock(nextBlock);
                if (code) statements.push(code);
                nextBlock = nextBlock.nextConnection?.targetBlock();
            }
        } catch (error) {
            console.error('Error parsing statement block:', error);
        }
        return statements;
    }

    parseBlock(block) {
        if (!block) return null;

        try {
            return this.parserManager.parseBlock(block, this);
        } catch (error) {
            console.error('Error parsing block:', error, block);
            return `// Ошибка парсинга блока: ${block.type}`;
        }
    }

    parseExpression(block) {
        if (!block) return '0';

        try {
            const type = block.type;

            // Специальные блоки для выражений
            const expressionMap = {
                'math_number': () => block.getFieldValue('NUM') || '0',
                'digital_read': () => `digitalRead(${block.getFieldValue('PIN')})`,
                'logic_boolean': () => block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false',
                'text': () => `"${block.getFieldValue('TEXT') || ''}"`,
                'variables_get': () => this.cleanVariableName(block.getFieldValue('VAR')),
                'analog_read': () => `analogRead(${block.getFieldValue('PIN') || 'A0'})`,
                'serial_available': () => 'Serial.available()',
                'serial_read_string': () => 'Serial.readString()',
                'serial_read_number': () => 'Serial.parseInt()',
                'serial_read_byte': () => 'Serial.read()'
            };

            if (expressionMap[type]) {
                return expressionMap[type]();
            }

            // Пробуем использовать стандартный парсер
            const code = this.parserManager.parseBlock(block, this);
            return code || '0';
        } catch (error) {
            console.error('Error parsing expression:', error, block);
            return '0';
        }
    }

    // Утилитные методы для парсеров
    addFunction(funcCode) {
        this.functions.push(funcCode);
    }

    addBackgroundTask(task) {
        this.backgroundTasks.push(task);
    }

    addGlobalVar(varCode) {
        this.globalVars.push(varCode);
    }

    cleanVariableName(name) {
        if (!name) return 'var';
        let cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(cleaned)) cleaned = '_' + cleaned;
        if (!cleaned || cleaned === '_') cleaned = 'var';
        return cleaned;
    }

    // Smart condition chain parsing methods (остаются без изменений)
    parseConditionChainSmart(block) {
        const mainBlock = this.findMainConditionBlock(block);

        if (block !== mainBlock) {
            if (mainBlock === "ERROR") {
                block.setWarningText('Ошибка! Первым блоком в цепочке должен быть Если (If)');
                return '//Ошибка! Первым блоком в цепочке должен быть IF';
            }
            block.setWarningText(null);
            return '';
        }

        return this.parseCompleteConditionChain(mainBlock);
    }

    findMainConditionBlock(block) {
        let currentBlock = block;

        while (currentBlock) {
            if (currentBlock.type === 'controls_if') {
                return currentBlock;
            }

            if (currentBlock.previousConnection && currentBlock.previousConnection.targetBlock()) {
                currentBlock = currentBlock.previousConnection.targetBlock();
            } else {
                return 'ERROR';
            }
        }

        return block;
    }

    parseCompleteConditionChain(mainBlock) {
        let code = '';
        let currentBlock = mainBlock;
        let isFirst = true;

        while (currentBlock) {
            switch(currentBlock.type) {
                case 'controls_if':
                    if (!isFirst) break;

                    const ifCondition = this.parseExpression(currentBlock.getInputTargetBlock('CONDITION'));
                    const ifBlocks = this.parseStatementBlock(currentBlock, 'THEN');

                    code += `if (${ifCondition}) {\n`;
                    code += ifBlocks.map(line => `  ${line}`).join('\n');
                    code += '\n}';
                    isFirst = false;
                    break;

                case 'controls_else_if':
                    const elseIfCondition = this.parseExpression(currentBlock.getInputTargetBlock('CONDITION'));
                    const elseIfBlocks = this.parseStatementBlock(currentBlock, 'THEN');

                    code += ` else if (${elseIfCondition}) {\n`;
                    code += elseIfBlocks.map(line => `  ${line}`).join('\n');
                    code += '\n}';
                    break;

                case 'controls_else':
                    const elseBlocks = this.parseStatementBlock(currentBlock, 'THEN');

                    code += ` else {\n`;
                    code += elseBlocks.map(line => `  ${line}`).join('\n');
                    code += '\n}';
                    currentBlock = null;
                    continue;
            }

            if (currentBlock) {
                currentBlock = currentBlock.nextConnection && currentBlock.nextConnection.targetBlock();
            }
        }

        return code;
    }
}