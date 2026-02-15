// userCodeProvider.js - исправленная версия
class UserCodeProvider extends SuggestionProvider {
    constructor() {
        super();
        this.userFunctions = new Map();
        this.userVariables = new Map();
        this.classInstances = new Map();
        this.macros = new Map();
        this.detectedClasses = new Set();

        this.lastCodeHash = '';
    }

    updateFromCode(code) {
        const codeHash = this.simpleHash(code);
        if (codeHash === this.lastCodeHash) return;

        this.lastCodeHash = codeHash;

        this.suggestions = [];
        this.userFunctions.clear();
        this.userVariables.clear();
        this.classInstances.clear();
        this.detectedClasses.clear();
        this.macros.clear();

        this.extractAllFromCode(code);
        this.createSuggestions();
    }


    simpleHash(str) {
        // БЫСТРЫЙ простой хеш для проверки изменений
        let hash = 0;
        for (let i = 0; i < Math.min(str.length, 1000); i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    extractAllFromCode(code) {
        const lines = code.split('\n');
        let inMultiLineComment = false;
        let currentFunction = null;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Обработка комментариев
            if (inMultiLineComment) {
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                    line = line.substring(line.indexOf('*/') + 2).trim();
                } else {
                    continue;
                }
            }

            if (line.startsWith('/*')) {
                inMultiLineComment = true;
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                    line = line.substring(line.indexOf('*/') + 2).trim();
                } else {
                    continue;
                }
            }

            if (line.startsWith('//')) continue;
            line = line.split('//')[0].trim();

            // Определение текущей функции
            const functionMatch = line.match(/(\w+)\s+(\w+)\s*\([^)]*\)\s*\{/);
            if (functionMatch) {
                currentFunction = functionMatch[2];
            }

            // Извлечение всего из строки
            this.extractFromLine(line, currentFunction);
        }
    }

    extractFromLine(line, currentFunction) {
        // Функции
        this.extractFunctionsFromLine(line);

        // Переменные и экземпляры классов
        this.extractVariablesFromLine(line, currentFunction);

        // Макросы
        this.extractMacrosFromLine(line);
    }

    extractFunctionsFromLine(line) {
        const functionPatterns = [
            /(void|int|float|double|boolean|byte|char|String|long|unsigned|bool|short)\s+(\w+)\s*\([^)]*\)\s*\{/,
            /(void)\s+(setup|loop)\s*\(\s*\)\s*\{/
        ];

        for (const pattern of functionPatterns) {
            const match = line.match(pattern);
            if (match) {
                const returnType = match[1];
                const funcName = match[2];

                if (!this.isBuiltInFunction(funcName)) {
                    this.userFunctions.set(funcName, {
                        name: funcName,
                        returnType: returnType,
                        type: 'user_function'
                    });
                }
            }
        }
    }

   extractVariablesFromLine(line, currentFunction) {
        // Базовые типы
        const basicTypes = ['int', 'float', 'double', 'boolean', 'byte', 'char', 'String', 'long', 'unsigned', 'bool', 'short'];

        // УЛУЧШЕННЫЕ паттерны для переменных
        const patterns = [
            // Базовые переменные: тип имя;
            /(int|float|double|boolean|byte|char|String|long|unsigned|bool|short)\s+(\w+)\s*[;=]/,
            // Базовые переменные с массивом: тип имя[];
            /(int|float|double|boolean|byte|char|String|long|unsigned|bool|short)\s+(\w+)\s*\[/,
            // Экземпляры классов: Класс имя(...);
            /(\w+)\s+(\w+)\s*\([^)]*\)\s*;/,
            // Экземпляры классов: Класс имя;
            /(\w+)\s+(\w+)\s*;/,
            // Экземпляры с присваиванием: Класс имя = ...;
            /(\w+)\s+(\w+)\s*=\s*\w+\s*\([^)]*\)\s*;/,
            // Упрощенное определение: имя(параметры) - для вызовов функций
            /(\w+)\.(\w+)\s*\(/  // для обнаружения использования методов
        ];

        for (const pattern of patterns) {
            const matches = line.matchAll(new RegExp(pattern, 'g'));
            for (const match of matches) {
                const firstPart = match[1];
                const varName = match[2];

                if (basicTypes.includes(firstPart)) {
                    // Базовая переменная
                    this.userVariables.set(varName, {
                        name: varName,
                        type: firstPart,
                        scope: currentFunction || 'global',
                        isClass: false
                    });
                    console.log(`Found variable: ${varName} of type ${firstPart}`);
                } else if (!this.isBasicType(firstPart)) {
                    // Экземпляр класса
                    this.detectedClasses.add(firstPart);
                    this.classInstances.set(varName, {
                        name: varName,
                        className: firstPart,
                        type: 'class_instance',
                        isClass: true,
                        scope: currentFunction || 'global'
                    });

                    this.userVariables.set(varName, {
                        name: varName,
                        type: firstPart,
                        scope: currentFunction || 'global',
                        isClass: true
                    });
                    console.log(`Found class instance: ${varName} of class ${firstPart}`);
                }
            }
        }

        // Обработка нескольких переменных в одной строке
        const multiVarPattern = /(int|float|String|boolean|byte|double|long|unsigned|bool|short)\s+([\w\s,]+);/;
        const multiVarMatch = line.match(multiVarPattern);
        if (multiVarMatch) {
            const type = multiVarMatch[1];
            const variables = multiVarMatch[2].split(',').map(v => v.trim());

            variables.forEach(varName => {
                if (varName && basicTypes.includes(type)) {
                    this.userVariables.set(varName, {
                        name: varName,
                        type: type,
                        scope: currentFunction || 'global',
                        isClass: false
                    });
                }
            });
        }
    }

    extractMacrosFromLine(line) {
        const defineMatch = line.match(/#define\s+(\w+)/);
        if (defineMatch) {
            this.macros.set(defineMatch[1], {
                name: defineMatch[1],
                type: 'macro'
            });
        }
    }

    createSuggestions() {
        // Пользовательские функции
        this.userFunctions.forEach((func, name) => {
            this.addSuggestion(
                name,
                `${name}() - ${func.returnType}`,
                `${name}()`,
                'user_function',
                'пользовательская функция',
                -1
            );
        });

        // Пользовательские переменные
        this.userVariables.forEach((variable, name) => {
            const typeLabel = variable.isClass ? 'объект' : 'переменная';
            this.addSuggestion(
                name,
                `${name} (${variable.type})`,
                name,
                variable.isClass ? 'class_instance' : 'user_variable',
                typeLabel,
                0
            );
        });

        // Макросы
        this.macros.forEach((macro, name) => {
            this.addSuggestion(
                name,
                `${name} - macro`,
                name,
                'macro',
                'макрос',
                0
            );
        });
    }

    // Получить тип переменной
    getVariableType(variableName) {
        const variable = this.userVariables.get(variableName);
        return variable ? variable.type : null;
    }

    // Проверка, является ли переменная классом
    isClassInstance(variableName) {
        const variable = this.userVariables.get(variableName);
        return variable ? variable.isClass : false;
    }

    isBasicType(typeName) {
        const basicTypes = [
            'int', 'float', 'double', 'boolean', 'bool', 'byte', 'char',
            'String', 'long', 'short', 'unsigned', 'void', 'const',
            'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t'
        ];
        return basicTypes.includes(typeName);
    }

    isBuiltInFunction(funcName) {
        const builtInFunctions = [
            'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogRead',
            'analogWrite', 'delay', 'millis', 'micros', 'random', 'map'
        ];
        return builtInFunctions.includes(funcName);
    }
}

// Защита от повторного объявления
if (typeof window.UserCodeProvider === 'undefined') {
    window.UserCodeProvider = UserCodeProvider;
}