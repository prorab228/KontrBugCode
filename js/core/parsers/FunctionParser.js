class FunctionParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'function_definition': this.parseFunctionDefinition,
            'function_call': this.parseFunctionCall,
            'function_call_no_return': this.parseFunctionCallNoReturn,
            'function_return': this.parseFunctionReturn,
            'background_task': this.parseBackgroundTask
        };
    }

    parseFunctionDefinition = (block, parser) => {
        try {
            const returnType = block.getFieldValue('RETURN_TYPE') || 'void';
            const name = block.getFieldValue('NAME') || 'myFunction';
            const cleanName = this.cleanVariableName(name);

            let params = [];
            const paramNames = block.paramNames_ || [];
            const paramTypes = block.paramTypes_ || [];

            for (let i = 0; i < paramNames.length; i++) {
                const paramType = paramTypes[i] || 'int';
                const paramName = paramNames[i] || `param${i + 1}`;
                const cleanParamName = this.cleanVariableName(paramName);
                params.push(`${paramType} ${cleanParamName}`);
            }

            const codeBlocks = parser.parseStatementBlock(block, 'CODE');

            let functionCode = `${returnType} ${cleanName}(${params.join(', ')}) {\n`;

            if (codeBlocks && codeBlocks.length > 0) {
                codeBlocks.forEach(line => {
                    if (line && line.trim()) {
                        functionCode += `  ${line}\n`;
                    }
                });
            }

            if (returnType !== 'void') {
                let hasReturn = false;
                for (const line of codeBlocks) {
                    if (line && line.includes('return')) {
                        hasReturn = true;
                        break;
                    }
                }

                if (!hasReturn) {
                    functionCode += `  return ${this.getDefaultValue(returnType)};\n`;
                }
            }

            functionCode += `}\n\n`;

            parser.addFunction(functionCode);
            return null;
        } catch (error) {
            console.error('Ошибка парсинга функции:', error);
            return `// Ошибка создания функции`;
        }
    }

    parseFunctionCall = (block, parser) => {
        try {
            const name = block.getFieldValue('NAME') || 'myFunction';
            const cleanName = this.cleanVariableName(name);

            let args = [];

            // Получаем информацию о параметрах функции из блока вызова
            const paramCount = block.paramCount_ || 0;
            const paramNames = block.paramNames_ || [];
            const paramTypes = block.paramTypes_ || [];

            // Используем количество параметров, а не фиксированные 10 аргументов
            const maxArgs = Math.max(paramCount, 10); // Но не меньше 10 на всякий случай

            for (let i = 0; i < maxArgs; i++) {
                const argInputName = 'ARG_' + i;
                const argInput = block.getInput(argInputName);

                // Если у функции есть этот параметр, обрабатываем аргумент
                if (i < paramCount) {
                    if (argInput) {
                        const argBlock = argInput.connection && argInput.connection.targetBlock();
                        if (argBlock) {
                            args.push(parser.parseExpression(argBlock));
                        }
                    }
                } else {
                    // Для параметров сверх текущего количества, просто проверяем если они есть
                    if (argInput && argInput.connection && argInput.connection.targetBlock()) {
                        const argBlock = argInput.connection.targetBlock();
                        args.push(parser.parseExpression(argBlock));
                    }
                }
            }

            // Если параметров не было определено через paramCount_, используем старый метод
            if (args.length === 0) {
                for (let i = 1; i <= 3; i++) {
                    const argBlock = block.getInputTargetBlock('ARG' + i);
                    if (argBlock) {
                        args.push(parser.parseExpression(argBlock));
                    }
                }
            }

            // Фильтруем пустые аргументы
            args = args.filter(arg => arg !== undefined && arg !== null);

            return `${cleanName}(${args.join(', ')})`;
        } catch (error) {
            console.error('Ошибка парсинга вызова функции:', error);
            const funcName = this.cleanVariableName(block.getFieldValue('NAME') || 'myFunction');
            return `${funcName}()`;
        }
    }



    parseFunctionCallNoReturn = (block, parser) => {
        try {
            const callCode = this.parseFunctionCall(block, parser);
            return callCode ? callCode + ';' : '';
        } catch (error) {
            console.error('Ошибка парсинга вызова функции без возврата:', error);
            const funcName = this.cleanVariableName(block.getFieldValue('NAME') || 'myFunction');
            return `${funcName}();`;
        }
    }

    parseFunctionReturn = (block, parser) => {
        try {
            const valueBlock = block.getInputTargetBlock('VALUE');
            const value = valueBlock ? parser.parseExpression(valueBlock) : '0';
            return `return ${value};`;
        } catch (error) {
            return 'return 0;';
        }
    }

    parseBackgroundTask = (block, parser) => {
        try {
            const name = block.getFieldValue('NAME') || 'backgroundTask';
            const cleanName = this.cleanVariableName(name);
            const setupBlocks = parser.parseStatementBlock(block, 'SETUP_CODE');
            const loopBlocks = parser.parseStatementBlock(block, 'LOOP_CODE');

            parser.addBackgroundTask({
                globalVars: `// Фоновая задача: ${cleanName}\nunsigned long ${cleanName}_previousMillis = 0;\nconst long ${cleanName}_interval = 100;`,
                setupCode: setupBlocks.join('\n  '),
                loopCode: `// ${cleanName} задача\nunsigned long ${cleanName}_currentMillis = millis();\nif (${cleanName}_currentMillis - ${cleanName}_previousMillis >= ${cleanName}_interval) {\n  ${cleanName}_previousMillis = ${cleanName}_currentMillis;\n  ${loopBlocks.map(line => `  ${line}`).join('\n  ')}\n}`
            });

            return null;
        } catch (error) {
            return null;
        }
    }

    getDefaultValue = (type) => {
        const defaults = {
            'int': '0',
            'float': '0.0',
            'bool': 'false',
            'String': '""',
            'char*': '""'
        };
        return defaults[type] || '0';
    }

    getDefaultValueForParam = (block, paramIndex) => {
        const paramType = block.paramTypes_ && block.paramTypes_[paramIndex];
        if (paramType) {
            switch(paramType) {
                case 'int': return '0';
                case 'float': return '0.0';
                case 'bool': return 'false';
                case 'String': return '""';
                case 'char*': return '""';
                default: return '0';
            }
        }
        return '0';
    }
}