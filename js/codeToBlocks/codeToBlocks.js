// codeToBlocks.js - улучшенная версия с надежным преобразованием базовых конструкций

class CodeToBlocksConverter {
    // ВЫЗЫВАЕМ ПРОВЕРКУ ПРИ ИНИЦИАЛИЗАЦИИ
    static init() {
        this.workspace = null;
        this.variables = new Map();
        this.blockCount = 0;

        if (window.CodeToBlocksConverter && window.workspace) {
            CodeToBlocksConverter.setWorkspace(window.workspace);
        }

        // Проверяем доступность блоков
        this.checkBlockAvailability();

        console.log('CodeToBlocksConverter initialized');
    }

    static setWorkspace(workspace) {
        this.workspace = workspace;
        console.log('Workspace set for CodeToBlocksConverter');
    }

    // Основной метод преобразования
    static convert(code) {
        if (!this.workspace) {
            console.error('Workspace not set for conversion');
            return false;
        }

        try {
            console.log('Starting code conversion...');

            // Полностью очищаем рабочую область
            this.workspace.clear();
            this.variables.clear();
            this.blockCount = 0;

            // Парсим код
            const parsedCode = this.parseCode(code);
            console.log('Parsed code:', parsedCode);

            // Генерируем блоки
            this.generateBlocks(parsedCode);

            // Принудительно обновляем представление
            this.forceRender();
            this.forceWorkspaceUpdate();

            console.log(`Code conversion completed successfully. Created ${this.blockCount} blocks`);
            return true;

        } catch (error) {
            console.error('Error in convert method:', error);
            return false;
        }
    }

    // МЕТОД ДЛЯ ПРИНУДИТЕЛЬНОГО ОБНОВЛЕНИЯ WORKSPACE
    static forceWorkspaceUpdate() {
        if (!this.workspace) return;

        try {
            // Обновляем рендеринг
            if (this.workspace.render) {
                this.workspace.render();
            }

            // Обновляем размер workspace
            if (this.workspace.resize) {
                setTimeout(() => {
                    this.workspace.resize();
                }, 100);
            }

            // Принудительно обновляем все блоки
            const blocks = this.workspace.getAllBlocks(false);
            blocks.forEach(block => {
                if (block.render) {
                    block.render();
                }
            });

            console.log('Workspace force updated');
        } catch (error) {
            console.warn('Error in forceWorkspaceUpdate:', error);
        }
    }

    // Принудительный рендеринг
    static forceRender() {
        if (!this.workspace) return;

        try {
            if (this.workspace.render) {
                this.workspace.render();
            }

            // Обновляем размер workspace
            if (this.workspace.resize) {
                setTimeout(() => {
                    this.workspace.resize();
                }, 100);
            }
        } catch (error) {
            console.warn('Error in forceRender:', error);
        }
    }

    // Улучшенный парсинг кода
    // Улучшенный парсинг кода
    static parseCode(code) {
        const result = {
            setup: [],
            loop: [],
            variables: [],
            functions: []
        };

        // Удаляем комментарии
        code = this.removeComments(code);
        console.log('Code after removing comments:', code);

        // УЛУЧШЕННЫЙ ПОИСК ФУНКЦИЙ - учитываем вложенные скобки
        const setupBody = this.extractFunctionBody(code, 'setup');
        const loopBody = this.extractFunctionBody(code, 'loop');

        if (setupBody) {
            console.log('Setup body found:', setupBody);
            result.setup = this.parseFunctionBody(setupBody);
        }

        if (loopBody) {
            console.log('Loop body found:', loopBody);
            result.loop = this.parseFunctionBody(loopBody);
        }

        // Ищем глобальные переменные
        const globalCode = code
            .replace(/void\s+setup\s*\([^)]*\)\s*\{[^}]*\}\s*/gi, '')
            .replace(/void\s+loop\s*\([^)]*\)\s*\{[^}]*\}\s*/gi, '')
            .trim();

        if (globalCode) {
            result.variables = this.parseGlobalVariables(globalCode);
        }

        return result;
    }

    // ПАРСИНГ ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
    static parseGlobalVariables(globalCode) {
        const variables = [];
        const lines = globalCode.split(';')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        for (const line of lines) {
            const statement = this.parseStatement(line);
            if (statement && statement.type === 'variable') {
                variables.push(statement);
            }
        }

        return variables;
    }

        // МЕТОД ДЛЯ ИЗВЛЕЧЕНИЯ ТЕЛА ФУНКЦИИ С УЧЕТОМ ВЛОЖЕННЫХ СКОБОК
    static extractFunctionBody(code, functionName) {
        const functionRegex = new RegExp(`void\\s+${functionName}\\s*\\(\\s*\\)\\s*\\{`, 'g');
        const match = functionRegex.exec(code);

        if (!match) {
            console.log(`Function ${functionName} not found`);
            return null;
        }

        let startIndex = match.index + match[0].length;
        let braceCount = 1;
        let currentIndex = startIndex;
        let inString = false;
        let stringChar = null;

        while (braceCount > 0 && currentIndex < code.length) {
            const char = code[currentIndex];

            // Обрабатываем строки
            if (char === '"' || char === "'") {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (stringChar === char) {
                    inString = false;
                    stringChar = null;
                }
            }

            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
            }

            currentIndex++;
        }

        if (braceCount === 0) {
            const body = code.substring(startIndex, currentIndex - 1).trim();
            return body;
        }

        return null;
    }

        // УДАЛЕНИЕ КОММЕНТАРИЕВ
    static removeComments(code) {
        return code
            .replace(/\/\/.*$/gm, '') // Однострочные комментарии
            .replace(/\/\*[\s\S]*?\*\//g, '') // Многострочные комментарии
            .trim();
    }


    // Улучшенная предобработка кода
    static preprocessCode(code) {
        return code
            .replace(/\/\/.*$/gm, '') // Однострочные комментарии
            .replace(/\/\*[\s\S]*?\*\//g, '') // Многострочные комментарии
            .replace(/\r\n/g, '\n') // Нормализуем переводы строк
            .replace(/\n+/g, ' ') // Заменяем множественные переводы строк на пробелы
            .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
            .replace(/\s*\{\s*/g, '{ ') // Стандартизируем пробелы вокруг {
            .replace(/\s*\}\s*/g, ' } ') // Стандартизируем пробелы вокруг }
            .replace(/\s*\(\s*/g, '(') // Убираем пробелы вокруг (
            .replace(/\s*\)\s*/g, ')') // Убираем пробелы вокруг )
            .replace(/\s*;\s*/g, '; ') // Стандартизируем пробелы вокруг ;
            .trim();
    }

    // Очистка тела функции
    static cleanFunctionBody(body) {
        return body
            .trim()
            .replace(/^\{(.*)\}$/, '$1') // Убираем обрамляющие фигурные скобки
            .trim();
    }

    // Парсинг глобальных элементов
    static parseGlobalElements(globalCode) {
        const result = {
            variables: [],
            functions: []
        };

        const lines = globalCode.split(';')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        for (const line of lines) {
            // Проверяем, является ли строка объявлением функции
            if (line.match(/^(void|int|float|String|boolean|byte|long|char)\s+\w+\s*\([^)]*\)\s*\{?/)) {
                const func = this.parseFunctionDeclaration(line);
                if (func) {
                    result.functions.push(func);
                }
            } else {
                // Парсим как переменную или другое объявление
                const statement = this.parseStatement(line);
                if (statement && statement.type === 'variable') {
                    result.variables.push(statement);
                }
            }
        }

        return result;
    }

    // Парсинг объявления функции
    static parseFunctionDeclaration(line) {
        const match = line.match(/^(void|int|float|String|boolean|byte|long|char)\s+(\w+)\s*\(([^)]*)\)\s*\{?/);
        if (match) {
            return {
                type: 'function',
                returnType: match[1],
                name: match[2],
                parameters: match[3] || '',
                body: line // В упрощенной версии сохраняем всю строку
            };
        }
        return null;
    }

      // ПАРСИНГ ТЕЛА ФУНКЦИИ
    static parseFunctionBody(body) {
        const statements = [];

        if (!body || body.trim() === '') return statements;

        // Разбиваем на операторы с учетом фигурных скобок
        const lines = this.splitStatements(body);
        console.log('Split statements:', lines);

        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.length === 0) continue;

            const statement = this.parseStatement(cleanLine);
            if (statement) {
                statements.push(statement);
            } else {
                console.warn('Could not parse statement:', cleanLine);
            }
        }

        return statements;
    }

    // РАЗБИЕНИЕ НА ОПЕРАТОРЫ С УЧЕТОМ СКОБОК
     // УЛУЧШЕННОЕ РАЗБИЕНИЕ НА ОПЕРАТОРЫ
 // УЛУЧШЕННОЕ РАЗБИЕНИЕ НА ОПЕРАТОРЫ ДЛЯ УСЛОВНЫХ КОНСТРУКЦИЙ
static splitStatements(body) {
    const statements = [];
    let current = '';
    let braceCount = 0;
    let inString = false;
    let stringChar = null;

    for (let i = 0; i < body.length; i++) {
        const char = body[i];

        // Обрабатываем строки
        if (char === '"' || char === "'") {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (stringChar === char) {
                inString = false;
                stringChar = null;
            }
        }

        if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }

        // Разделитель - точка с запятой, когда все скобки закрыты
        if (char === ';' && braceCount === 0 && !inString) {
            if (current.trim()) {
                statements.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }

    // Добавляем последний statement
    if (current.trim()) {
        statements.push(current.trim());
    }

    return statements;
}

    // ДОБАВЛЯЕМ ПАРСЕР ДЛЯ analogWrite
    static parseStatement(line) {
        if (!line) return null;

        console.log('Parsing line:', line);

        // Упрощаем строку для парсинга
        const cleanLine = line.replace(/\s+/g, ' ').trim();

        // Полная условная конструкция if-else if-else
        const conditionalMatch = this.parseFullConditional(cleanLine);
        if (conditionalMatch) {
            return conditionalMatch;
        }

        // pinMode
        let match = cleanLine.match(/pinMode\s*\(\s*(\d+|\w+)\s*,\s*(INPUT|OUTPUT|INPUT_PULLUP)\s*\)/i);
        if (match) {
            return {
                type: 'pinMode',
                pin: match[1],
                mode: match[2].toUpperCase()
            };
        }

        // digitalWrite
        match = cleanLine.match(/digitalWrite\s*\(\s*(\d+|\w+)\s*,\s*(HIGH|LOW)\s*\)/i);
        if (match) {
            return {
                type: 'digitalWrite',
                pin: match[1],
                state: match[2].toUpperCase()
            };
        }

        // analogWrite - ДОБАВЛЯЕМ НОВЫЙ ПАРСЕР
        match = cleanLine.match(/analogWrite\s*\(\s*(\d+|\w+)\s*,\s*(\d+|\w+)\s*\)/i);
        if (match) {
            return {
                type: 'analogWrite',
                pin: match[1],
                value: match[2]
            };
        }

        // delay
        match = cleanLine.match(/delay\s*\(\s*(\d+)\s*\)/i);
        if (match) {
            return {
                type: 'delay',
                time: match[1]
            };
        }

        // Serial.begin
        match = cleanLine.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/i);
        if (match) {
            return {
                type: 'serialBegin',
                baud: match[1]
            };
        }

        // Serial.print/println с двойными кавычками
        match = cleanLine.match(/Serial\.(print|println)\s*\(\s*"([^"]*)"\s*\)/i);
        if (match) {
            return {
                type: 'serialPrint',
                method: match[1],
                text: match[2],
                isString: true
            };
        }

        // Serial.print/println с одинарными кавычками
        match = cleanLine.match(/Serial\.(print|println)\s*\(\s*'([^']*)'\s*\)/i);
        if (match) {
            return {
                type: 'serialPrint',
                method: match[1],
                text: match[2],
                isString: true
            };
        }

        // Serial.available
        match = cleanLine.match(/Serial\.available\s*\(\s*\)/i);
        if (match) {
            return {
                type: 'serialAvailable'
            };
        }

        // Serial.readString
        match = cleanLine.match(/Serial\.readString\s*\(\s*\)/i);
        if (match) {
            return {
                type: 'serialReadString'
            };
        }

        // Объявление переменной
        match = cleanLine.match(/(int|float|String|boolean|byte|long|char)\s+(\w+)\s*(=\s*(.+))?/);
        if (match) {
            return {
                type: 'variable',
                varType: match[1],
                name: match[2],
                value: match[4] || null
            };
        }

        // Присваивание переменной
        match = cleanLine.match(/(\w+)\s*=\s*(.+)/);
        if (match && !this.isControlStructure(cleanLine)) {
            return {
                type: 'assignment',
                variable: match[1],
                value: match[2].trim()
            };
        }

        return null;
    }


    // Проверка, является ли строка управляющей конструкцией
      // ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ
    static isControlStructure(line) {
        return line.includes('if') || line.includes('for') || line.includes('while');
    }

    // Генерация блоков - УЛУЧШЕННАЯ ВЕРСИЯ
    static generateBlocks(parsedCode) {
        let x = 20, y = 20;

        console.log('Generating blocks from:', parsedCode);

        // Создаем блоки для глобальных переменных
        for (const variable of parsedCode.variables) {
            this.createVariableBlock(variable, x, y);
            y += 80;
        }

        // Создаем блок setup
        if (parsedCode.setup.length > 0) {
            const setupBlock = this.createBlock('arduino_setup', x, y);
            y += 100;

            // Добавляем statements в setup
            let previousBlock = null;
            for (const statement of parsedCode.setup) {
                const block = this.createStatementBlock(statement, x + 40, y);
                if (block) {
                    if (!previousBlock) {
                        // Первый блок - подключаем к setup блоку
                        this.connectToParent(setupBlock, block, 'SETUP_CODE');
                    } else {
                        // Последующие блоки - подключаем к предыдущему блоку
                        this.connectToPrevious(previousBlock, block);
                    }
                    previousBlock = block;
                    y += 80;
                }
            }
        }

        // Создаем блок loop
        if (parsedCode.loop.length > 0) {
            y += 40; // Добавляем отступ между setup и loop
            const loopBlock = this.createBlock('arduino_loop', x, y);
            y += 100;

            // Добавляем statements в loop
            let previousBlock = null;
            for (const statement of parsedCode.loop) {
                const block = this.createStatementBlock(statement, x + 40, y);
                if (block) {
                    if (!previousBlock) {
                        // Первый блок - подключаем к loop блоку
                        this.connectToParent(loopBlock, block, 'LOOP_CODE');
                    } else {
                        // Последующие блоки - подключаем к предыдущему блоку
                        this.connectToPrevious(previousBlock, block);
                    }
                    previousBlock = block;
                    y += 80;
                }
            }
        }

        // Создаем блоки для функций (упрощенно)
        for (const func of parsedCode.functions) {
            this.createFunctionBlock(func, x, y);
            y += 120;
        }
    }

    // Подключение блока к родительскому блоку (первый блок в цепочке)
    static connectToParent(parentBlock, childBlock, connectionName) {
        if (!parentBlock || !childBlock) {
            console.warn('Cannot connect to parent: parent or child is null');
            return;
        }

        try {
            const parentConnection = parentBlock.getInput(connectionName).connection;
            const childConnection = childBlock.previousConnection;

            if (parentConnection && childConnection) {
                parentConnection.connect(childConnection);
                console.log(`Connected ${childBlock.type} to parent ${parentBlock.type} via ${connectionName}`);
            } else {
                console.warn('Cannot connect to parent: missing connections');
                console.log('Parent connection:', parentConnection);
                console.log('Child connection:', childConnection);
            }
        } catch (error) {
            console.error('Error connecting to parent:', error);
        }
    }

    // УЛУЧШЕННЫЙ МЕТОД ПОДКЛЮЧЕНИЯ БЛОКОВ
    static connectToPrevious(previousBlock, nextBlock) {
        if (!previousBlock || !nextBlock) {
            console.warn('Cannot connect to previous: previous or next block is null');
            return;
        }

        try {
            // ДОБАВЛЯЕМ ПРОВЕРКУ СУЩЕСТВОВАНИЯ СОЕДИНЕНИЙ
            if (!previousBlock.nextConnection) {
                console.warn(`Previous block ${previousBlock.type} has no nextConnection`);
                return;
            }

            if (!nextBlock.previousConnection) {
                console.warn(`Next block ${nextBlock.type} has no previousConnection`);
                return;
            }

            const previousConnection = previousBlock.nextConnection;
            const nextConnection = nextBlock.previousConnection;

            if (previousConnection && nextConnection) {
                // ОТКЛЮЧАЕМ ВИЗУАЛЬНОЕ ОБНОВЛЕНИЕ НА ВРЕМЯ ПОДКЛЮЧЕНИЯ
                Blockly.Events.disable();
                previousConnection.connect(nextConnection);
                Blockly.Events.enable();

                console.log(`Connected ${nextBlock.type} to previous ${previousBlock.type}`);
            } else {
                console.warn('Cannot connect to previous: missing connections');
            }
        } catch (error) {
            console.error('Error connecting to previous:', error);
            // ВОССТАНАВЛИВАЕМ СОБЫТИЯ В СЛУЧАЕ ОШИБКИ
            Blockly.Events.enable();
        }
    }

    // ИСПРАВЛЕННЫЙ МЕТОД СОЗДАНИЯ БЛОКОВ
        // УЛУЧШЕННЫЙ МЕТОД СОЗДАНИЯ БЛОКОВ
    static createBlock(type, x, y) {
        if (!this.workspace) {
            console.error('No workspace available');
            return null;
        }

        // ПРОВЕРКА КООРДИНАТ
        if (x === undefined || x === null || isNaN(x)) x = 20;
        if (y === undefined || y === null || isNaN(y)) y = 20;

        try {
            console.log(`Creating block: ${type} at (${x}, ${y})`);

            const block = this.workspace.newBlock(type);
            if (!block) {
                console.error(`Failed to create block of type: ${type}`);
                return null;
            }

            // Инициализация БЕЗ немедленного рендеринга
            block.initSvg();

            // Устанавливаем позицию ПЕРЕД рендерингом
            block.moveBy(x, y);

            // Рендеринг после установки позиции
            block.render();

            this.blockCount++;
            console.log(`Successfully created block: ${type}, ID: ${block.id}`);

            return block;

        } catch (error) {
            console.error(`Error creating block ${type}:`, error);
            return null;
        }
    }

       // ВЫЧИСЛЕНИЕ ВЫСОТЫ БЛОКА ДЛЯ ПРАВИЛЬНОГО ПОЗИЦИОНИРОВАНИЯ
    static calculateBlockHeight(body) {
        if (!body) return 0;
        const statements = this.parseFunctionBody(body);
        return statements.length * 80;
    }

        // ПАРСИНГ УСЛОВИЯ

    // УЛУЧШЕННЫЙ ПАРСИНГ УСЛОВИЙ С КООРДИНАТАМИ
    static parseCondition(condition, x, y) {
        condition = condition.trim();
        console.log('Parsing condition:', condition);

        // Serial.available()
        if (condition === 'Serial.available()') {
            return this.createBlock('serial_available', x, y);
        }

        // Простые сравнения (например, "5 > 10")
        const comparisonMatch = condition.match(/(.+)\s*([<>]=?|==|!=)\s*(.+)/);
        if (comparisonMatch) {
            const left = comparisonMatch[1].trim();
            const operator = comparisonMatch[2];
            const right = comparisonMatch[3].trim();

            const comparisonBlock = this.createBlock('logic_compare', x, y);
            if (comparisonBlock) {
                // Устанавливаем оператор
                const operatorMap = {
                    '==': 'EQ',
                    '!=': 'NEQ',
                    '<': 'LT',
                    '>': 'GT',
                    '<=': 'LTE',
                    '>=': 'GTE'
                };
                comparisonBlock.setFieldValue(operatorMap[operator] || 'EQ', 'OP');

                // Создаем блоки для значений с правильными координатами
                const leftBlock = this.createValueBlock(left, x + 50, y);
                const rightBlock = this.createValueBlock(right, x + 50, y + 40);

                if (leftBlock) this.connectValueToBlock(comparisonBlock, leftBlock, 'A');
                if (rightBlock) this.connectValueToBlock(comparisonBlock, rightBlock, 'B');

                return comparisonBlock;
            }
        }

        // Числовое условие (например, "0", "1")
        if (/^\d+$/.test(condition)) {
            const block = this.createBlock('math_number', x, y);
            if (block) {
                block.setFieldValue(condition, 'NUM');
            }
            return block;
        }

        // Логическое значение
        if (condition === 'true' || condition === 'false') {
            const block = this.createBlock('logic_boolean', x, y);
            if (block) {
                block.setFieldValue(condition.toUpperCase(), 'BOOL');
            }
            return block;
        }

        // По умолчанию создаем текстовый блок
        const block = this.createBlock('text', x, y);
        if (block) {
            block.setFieldValue(condition, 'TEXT');
        }
        return block;
    }


    // ПАРСИНГ ЗНАЧЕНИЙ ДЛЯ УСЛОВИЙ
    static parseConditionValue(value) {
        value = value.trim();

        // Число
        if (/^\d+$/.test(value)) {
            const block = this.createBlock('math_number', 0, 0);
            if (block) {
                block.setFieldValue(value, 'NUM');
            }
            return block;
        }

        // Строка в кавычках
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            const block = this.createBlock('text', 0, 0);
            if (block) {
                block.setFieldValue(value.slice(1, -1), 'TEXT');
            }
            return block;
        }

        // Переменная
        const block = this.createBlock('variables_get', 0, 0);
        if (block) {
            block.setFieldValue(value, 'VAR');
        }
        return block;
    }

// ПОЛНОСТЬЮ ПЕРЕРАБОТАННЫЙ ПАРСИНГ УСЛОВНЫХ КОНСТРУКЦИЙ
static parseFullConditional(line) {
    if (!line.startsWith('if')) return null;

    console.log('Parsing conditional:', line);

    const result = {
        type: 'conditional',
        branches: []
    };

    let remaining = line.trim();

    // Обрабатываем все ветки условий
    while (remaining.length > 0) {
        if (remaining.startsWith('if')) {
            const ifResult = this.parseIfBranch(remaining);
            if (ifResult) {
                result.branches.push(ifResult.branch);
                remaining = ifResult.remaining.trim();
                continue;
            }
        }
        else if (remaining.startsWith('else if')) {
            const elseIfResult = this.parseElseIfBranch(remaining);
            if (elseIfResult) {
                result.branches.push(elseIfResult.branch);
                remaining = elseIfResult.remaining.trim();
                continue;
            }
        }
        else if (remaining.startsWith('else')) {
            const elseResult = this.parseElseBranch(remaining);
            if (elseResult) {
                result.branches.push(elseResult.branch);
                remaining = elseResult.remaining.trim();
                break;
            }
        }

        // Если ни одно условие не сработало, выходим
        break;
    }

    console.log('Conditional parsing result:', result);
    return result.branches.length > 0 ? result : null;
}

// ПАРСИНГ ВЕТКИ IF
static parseIfBranch(code) {
    const match = code.match(/^if\s*\(\s*(.+?)\s*\)\s*\{/);
    if (!match) return null;

    const condition = match[1].trim();
    const bodyStart = match[0].length;

    // Находим закрывающую скобку для тела if
    const bodyResult = this.findMatchingBraces(code.substring(bodyStart - 1));
    if (!bodyResult) return null;

    const body = bodyResult.content; // без обрамляющих скобок
    const remaining = code.substring(bodyStart + bodyResult.fullLength - 1);

    return {
        branch: {
            type: 'if',
            condition: condition,
            body: body.trim()
        },
        remaining: remaining
    };
}

// ПАРСИНГ ВЕТКИ ELSE IF
static parseElseIfBranch(code) {
    const match = code.match(/^else\s+if\s*\(\s*(.+?)\s*\)\s*\{/);
    if (!match) return null;

    const condition = match[1].trim();
    const bodyStart = match[0].length;

    // Находим закрывающую скобку для тела else if
    const bodyResult = this.findMatchingBraces(code.substring(bodyStart - 1));
    if (!bodyResult) return null;

    const body = bodyResult.content; // без обрамляющих скобок
    const remaining = code.substring(bodyStart + bodyResult.fullLength - 1);

    return {
        branch: {
            type: 'else_if',
            condition: condition,
            body: body.trim()
        },
        remaining: remaining
    };
}

// ПАРСИНГ ВЕТКИ ELSE
static parseElseBranch(code) {
    const match = code.match(/^else\s*\{/);
    if (!match) return null;

    const bodyStart = match[0].length;

    // Находим закрывающую скобку для тела else
    const bodyResult = this.findMatchingBraces(code.substring(bodyStart - 1));
    if (!bodyResult) return null;

    const body = bodyResult.content; // без обрамляющих скобок
    const remaining = code.substring(bodyStart + bodyResult.fullLength - 1);

    return {
        branch: {
            type: 'else',
            body: body.trim()
        },
        remaining: remaining
    };
}

// ПОИСК СООТВЕТСТВУЮЩИХ ФИГУРНЫХ СКОБОК
static findMatchingBraces(code) {
    let braceCount = 0;
    let inString = false;
    let stringChar = null;
    let content = '';
    let fullLength = 0;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];

        // Обрабатываем строки
        if (char === '"' || char === "'") {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (stringChar === char) {
                inString = false;
                stringChar = null;
            }
        }

        if (!inString) {
            if (char === '{') {
                if (braceCount === 0) {
                    // Начинаем отсчет с первой скобки
                    braceCount = 1;
                    continue;
                } else {
                    braceCount++;
                }
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    // Нашли закрывающую скобку
                    fullLength = i + 1;
                    break;
                }
            }
        }

        // Добавляем символ в содержимое (кроме первой открывающей скобки)
        if (braceCount > 0) {
            content += char;
        }
    }

    if (braceCount === 0 && fullLength > 0) {
        return {
            content: content.substring(1), // убираем первую открывающую скобку
            fullLength: fullLength
        };
    }

    return null;
}

      // ОБНОВЛЯЕМ СОЗДАНИЕ УСЛОВНЫХ КОНСТРУКЦИЙ
    // УЛУЧШЕННОЕ СОЗДАНИЕ УСЛОВНЫХ КОНСТРУКЦИЙ
    static createConditionalBlock(statement, x, y) {
        if (!statement.branches || statement.branches.length === 0) return null;

        console.log('Creating conditional block with branches:', statement.branches);

        let currentX = x;
        let currentY = y;
        let firstBlock = null;
        let previousBlock = null;

        for (let i = 0; i < statement.branches.length; i++) {
            const branch = statement.branches[i];
            let block = null;

            if (branch.type === 'if') {
                block = this.createBlock('controls_if', currentX, currentY);
                if (block) {
                    // Устанавливаем условие
                    const conditionBlock = this.parseCondition(branch.condition, currentX + 40, currentY);
                    if (conditionBlock) {
                        this.connectValueToBlock(block, conditionBlock, 'CONDITION');
                    }

                    // Создаем тело if
                    this.createConditionalBody(block, branch.body, currentX + 40, currentY + 80);

                    if (!firstBlock) firstBlock = block;
                    previousBlock = block;

                    currentY += this.calculateBlockHeight(branch.body) + 120;
                }
            }
            else if (branch.type === 'else_if' && previousBlock) {
                // ПРОВЕРЯЕМ СУЩЕСТВОВАНИЕ БЛОКА
                if (!Blockly.Blocks['controls_else_if']) {
                    console.error('Block controls_else_if is not defined');
                    continue;
                }

                block = this.createBlock('controls_else_if', currentX, currentY);
                if (block) {
                    // Соединяем с предыдущим блоком
                    this.connectToPrevious(previousBlock, block);

                    // Устанавливаем условие
                    const conditionBlock = this.parseCondition(branch.condition, currentX + 40, currentY);
                    if (conditionBlock) {
                        this.connectValueToBlock(block, conditionBlock, 'CONDITION');
                    }

                    // Создаем тело else if
                    this.createConditionalBody(block, branch.body, currentX + 40, currentY + 80);

                    previousBlock = block;
                    currentY += this.calculateBlockHeight(branch.body) + 120;
                }
            }
            else if (branch.type === 'else' && previousBlock) {
                // ПРОВЕРЯЕМ СУЩЕСТВОВАНИЕ БЛОКА
                if (!Blockly.Blocks['controls_else']) {
                    console.error('Block controls_else is not defined');
                    continue;
                }

                block = this.createBlock('controls_else', currentX, currentY);
                if (block) {
                    // Соединяем с предыдущим блоком
                    this.connectToPrevious(previousBlock, block);

                    // Создаем тело else
                    this.createConditionalBody(block, branch.body, currentX + 40, currentY + 80);

                    previousBlock = block;
                    currentY += this.calculateBlockHeight(branch.body) + 120;
                }
            }
        }

        return firstBlock;
    }





    // СОЗДАНИЕ ТЕЛА УСЛОВНОЙ КОНСТРУКЦИИ
    static createConditionalBody(parentBlock, body, x, y) {
        if (!body || !parentBlock) return;

        const bodyStatements = this.parseFunctionBody(body);
        let previousBlock = null;

        bodyStatements.forEach((bodyStmt, index) => {
            const bodyBlock = this.createStatementBlock(bodyStmt, x, y + (index * 80));
            if (bodyBlock) {
                if (!previousBlock) {
                    // Первый блок тела подключаем к родительскому блоку
                    this.connectToParent(parentBlock, bodyBlock, 'THEN');
                } else {
                    // Последующие блоки соединяем цепочкой
                    this.connectToPrevious(previousBlock, bodyBlock);
                }
                previousBlock = bodyBlock;
            }
        });
    }


        // ОБНОВЛЯЕМ createStatementBlock
    static createStatementBlock(statement, x, y) {
        if (!statement) return null;

        console.log('Creating statement block:', statement);

        switch (statement.type) {
            case 'conditional':
                return this.createConditionalBlock(statement, x, y);
            case 'if':
                // Обработка простого if (для обратной совместимости)
                const conditional = {
                    type: 'conditional',
                    branches: [statement]
                };
                return this.createConditionalBlock(conditional, x, y);
            case 'pinMode':
                return this.createPinModeBlock(statement, x, y);
            case 'digitalWrite':
                return this.createDigitalWriteBlock(statement, x, y);
            case 'analogWrite': // ДОБАВЛЯЕМ НОВЫЙ CASE
                return this.createAnalogWriteBlock(statement, x, y);
            case 'delay':
                return this.createDelayBlock(statement, x, y);
            case 'serialBegin':
                return this.createSerialBeginBlock(statement, x, y);
            case 'serialPrint':
                return this.createSerialPrintBlock(statement, x, y);
            case 'serialAvailable':
                return this.createSerialAvailableBlock(statement, x, y);
            case 'serialReadString':
                return this.createSerialReadStringBlock(statement, x, y);
            case 'assignment':
                return this.createAssignmentBlock(statement, x, y);
            default:
                console.warn('Unsupported statement type:', statement.type);
                return null;
        }
    }

    // Конкретные реализации блоков
    static createPinModeBlock(statement, x, y) {
        const block = this.createBlock('pin_mode', x, y);
        if (block) {
            // Проверяем, является ли pin числом или переменной
            if (!isNaN(statement.pin)) {
                block.setFieldValue(statement.pin, 'PIN');
            }
            block.setFieldValue(statement.mode, 'MODE');
        }
        return block;
    }

    static createDigitalWriteBlock(statement, x, y) {
        const block = this.createBlock('digital_write', x, y);
        if (block) {
            if (!isNaN(statement.pin)) {
                block.setFieldValue(statement.pin, 'PIN');
            }
            block.setFieldValue(statement.state, 'STATE');
        }
        return block;
    }

    static createDelayBlock(statement, x, y) {
        const block = this.createBlock('delay', x, y);
        if (block) {
            block.setFieldValue(statement.time, 'TIME');
        }
        return block;
    }

    static createSerialBeginBlock(statement, x, y) {
        const block = this.createBlock('serial_begin', x, y);
        if (block) {
            block.setFieldValue(statement.baud, 'BAUD');
        }
        return block;
    }

    // НОВЫЕ МЕТОДЫ ДЛЯ SERIAL
    static createSerialAvailableBlock(statement, x, y) {
        return this.createBlock('serial_available', x, y);
    }

    static createSerialReadStringBlock(statement, x, y) {
        return this.createBlock('serial_read_string', x, y);
    }

 // ОБНОВЛЕННЫЙ createSerialPrintBlock
    static createSerialPrintBlock(statement, x, y) {
        const blockType = statement.method === 'println' ? 'serial_println' : 'serial_print';
        const block = this.createBlock(blockType, x, y);

        if (block) {
            if (statement.isString) {
                // Создаем текстовый блок для строки
                const textBlock = this.createBlock('text', x + 120, y);
                if (textBlock) {
                    textBlock.setFieldValue(statement.text, 'TEXT');
                    this.connectValueToBlock(block, textBlock, 'TEXT');
                }
            } else {
                // Создаем блок для сложного выражения
                const textBlock = this.createBlock('text', x + 120, y);
                if (textBlock) {
                    textBlock.setFieldValue(statement.text, 'TEXT');
                    this.connectValueToBlock(block, textBlock, 'TEXT');
                }
            }
        }

        return block;
    }

//    static createAnalogWriteBlock(statement, x, y) {
//        const block = this.createBlock('analog_write', x, y);
//        if (block) {
//            // Устанавливаем PIN
//            if (!isNaN(statement.pin)) {
//                const pwmPins = ['3', '5', '6', '9', '10', '11'];
//                const pin = pwmPins.includes(statement.pin) ? statement.pin : '3';
//                block.setFieldValue(pin, 'PIN');
//            }
//
//            // Создаем блок для значения
//            if (!isNaN(statement.value)) {
//                const valueBlock = this.createBlock('math_number', x + 120, y);
//                if (valueBlock) {
//                    valueBlock.setFieldValue(statement.value, 'NUM');
//                    this.connectValueToBlock(block, valueBlock, 'VALUE');
//                }
//            } else {
//                // Значение - переменная
//                const varBlock = this.createBlock('variables_get', x + 120, y);
//                if (varBlock) {
//                    varBlock.setFieldValue(statement.value, 'VAR');
//                    this.connectValueToBlock(block, varBlock, 'VALUE');
//                }
//            }
//        }
//        return block;
//    }


    // ДОБАВЛЯЕМ СОЗДАНИЕ БЛОКА analogWrite
    static createAnalogWriteBlock(statement, x, y) {
        const block = this.createBlock('analog_write', x, y);
        if (block) {
            // Устанавливаем PIN из доступных PWM пинов
            const pwmPins = ['3', '5', '6', '9', '10', '11'];
            const pin = pwmPins.includes(statement.pin) ? statement.pin : '3';
            block.setFieldValue(pin, 'PIN');

            // Создаем блок для значения
            const valueBlock = this.createValueBlock(statement.value, x + 100, y);
            if (valueBlock) {
                this.connectValueToBlock(block, valueBlock, 'VALUE');
            }
        }
        return block;
    }

    static createAnalogReadBlock(statement, x, y) {
        const block = this.createBlock('analog_read', x, y);
        if (block) {
            // Устанавливаем PIN из аналоговых пинов
            const analogPins = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
            let pin = statement.pin;

            // Если pin число, преобразуем в A0-A7
            if (!isNaN(pin)) {
                const pinNum = parseInt(pin);
                if (pinNum >= 0 && pinNum <= 7) {
                    pin = 'A' + pinNum;
                }
            }

            if (analogPins.includes(pin)) {
                block.setFieldValue(pin, 'PIN');
            } else {
                block.setFieldValue('A0', 'PIN');
            }
        }
        return block;
    }

    static createDigitalReadBlock(statement, x, y) {
        const block = this.createBlock('digital_read', x, y);
        if (block) {
            if (!isNaN(statement.pin)) {
                block.setFieldValue(statement.pin, 'PIN');
            }
        }
        return block;
    }

    static createAssignmentBlock(statement, x, y) {
        const block = this.createBlock('variables_set', x, y);
        if (block) {
            block.setFieldValue(statement.variable, 'VAR');

            // Создаем блок для значения
            const valueBlock = this.createValueBlock(statement.value, x + 120, y);
            if (valueBlock) {
                this.connectValueToBlock(block, valueBlock, 'VALUE');
            }
        }
        return block;
    }

    static createFunctionCallBlock(statement, x, y) {
        const block = this.createBlock('function_call_simple', x, y);
        if (block) {
            block.setFieldValue(statement.name, 'NAME');
        }
        return block;
    }

    static createVariableBlock(statement, x, y) {
        const block = this.createBlock('variables_declare', x, y);
        if (block) {
            block.setFieldValue(statement.varType, 'TYPE');
            block.setFieldValue(statement.name, 'VAR');

            if (statement.value) {
                const valueBlock = this.createValueBlock(statement.value, x + 150, y);
                if (valueBlock) {
                    this.connectValueToBlock(block, valueBlock, 'VALUE');
                }
            }
        }
        return block;
    }

    static createFunctionBlock(func, x, y) {
        // Упрощенное создание блока функции
        const block = this.createBlock('function_simple', x, y);
        if (block) {
            block.setFieldValue(func.name, 'NAME');
        }
        return block;
    }

        // УЛУЧШЕННЫЙ МЕТОД ПОДКЛЮЧЕНИЯ ЗНАЧЕНИЙ
    static connectValueToBlock(targetBlock, valueBlock, inputName) {
        try {
            const input = targetBlock.getInput(inputName);
            if (!input) {
                console.warn(`Input ${inputName} not found in block ${targetBlock.type}`);
                return;
            }

            const connection = input.connection;
            if (!connection) {
                console.warn(`No connection found for input ${inputName} in block ${targetBlock.type}`);
                return;
            }

            if (!valueBlock.outputConnection) {
                console.warn(`Value block ${valueBlock.type} has no outputConnection`);
                return;
            }

            // ОТКЛЮЧАЕМ СОБЫТИЯ НА ВРЕМЯ ПОДКЛЮЧЕНИЯ
            Blockly.Events.disable();
            connection.connect(valueBlock.outputConnection);
            Blockly.Events.enable();

            console.log(`Connected ${valueBlock.type} to ${targetBlock.type} via ${inputName}`);

        } catch (error) {
            console.error('Error connecting value block:', error);
            // ВОССТАНАВЛИВАЕМ СОБЫТИЯ В СЛУЧАЕ ОШИБКИ
            Blockly.Events.enable();
        }
    }

    // МЕТОД ДЛЯ ПРОВЕРКИ ДОСТУПНЫХ БЛОКОВ
    static checkBlockAvailability() {
        const requiredBlocks = [
            'controls_if',
            'controls_else_if',
            'controls_else',
            'digital_write',
            'analog_write',
            'delay',
            'pin_mode',
            'serial_begin',
            'serial_print',
            'serial_println',
            'serial_available'
        ];

        console.log('=== BLOCK AVAILABILITY CHECK ===');
        requiredBlocks.forEach(blockType => {
            const isAvailable = !!Blockly.Blocks[blockType];
            console.log(`${blockType}: ${isAvailable ? '✅' : '❌'}`);
            if (!isAvailable) {
                console.warn(`Block ${blockType} is not available!`);
            }
        });
        console.log('=== END CHECK ===');
    }

    // МЕТОД ДЛЯ БЕЗОПАСНОГО ПОЛУЧЕНИЯ КООРДИНАТ
    static getSafeCoordinates(x, y, offsetX = 0, offsetY = 0) {
        const safeX = (x === undefined || x === null || isNaN(x)) ? 100 : x;
        const safeY = (y === undefined || y === null || isNaN(y)) ? 100 : y;
        return {
            x: safeX + offsetX,
            y: safeY + offsetY
        };
    }

    // Создание блоков значений
    static createValueBlock(value, x, y) {
        if (!value) return null;

        value = value.trim();

        // Число
        if (/^\d+$/.test(value)) {
            const block = this.createBlock('math_number', x, y);
            if (block) {
                block.setFieldValue(value, 'NUM');
            }
            return block;
        }

        // Строка в кавычках
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            const block = this.createBlock('text', x, y);
            if (block) {
                block.setFieldValue(value.slice(1, -1), 'TEXT');
            }
            return block;
        }

        // Переменная
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
            const block = this.createBlock('variables_get', x, y);
            if (block) {
                block.setFieldValue(value, 'VAR');
            }
            return block;
        }

        // Простое математическое выражение (упрощенно)
        if (/^[0-9+\-*/(). ]+$/.test(value)) {
            // Пока создаем как текстовый блок
            const block = this.createBlock('text', x, y);
            if (block) {
                block.setFieldValue(value, 'TEXT');
            }
            return block;
        }

        return null;
    }

    // Проверка возможности преобразования
    static canConvert(code) {
        const lines = code.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('//'));

        let supportedCount = 0;
        const supportedPatterns = [
            'pinMode', 'digitalWrite', 'delay', 'Serial.begin', 'Serial.print',
            'analogWrite', 'analogRead', 'digitalRead', 'void setup', 'void loop'
        ];

        lines.forEach(line => {
            if (supportedPatterns.some(pattern => line.includes(pattern))) {
                supportedCount++;
            }
        });

        const result = {
            canConvert: supportedCount > 0,
            supportedRatio: lines.length > 0 ? (supportedCount / lines.length) : 0,
            supportedCount: supportedCount,
            totalCount: lines.length
        };

        console.log('Conversion check:', result);
        return result;
    }

        // Дополнительный метод для отладки - показать что нашел парсер
    static debugParse(code) {
        console.log('=== DEBUG PARSER ===');
        console.log('Original code:', code);

        const preprocessed = this.preprocessCode(code);
        console.log('Preprocessed code:', preprocessed);

        const setupMatch = preprocessed.match(/void\s+setup\s*\(\s*\)\s*\{([^}]+)\}/i);
        console.log('Setup match:', setupMatch);

        const loopMatch = preprocessed.match(/void\s+loop\s*\(\s*\)\s*\{([^}]+)\}/i);
        console.log('Loop match:', loopMatch);

        const parsed = this.parseCode(code);
        console.log('Parsed result:', parsed);
        console.log('=== END DEBUG ===');

        return parsed;
    }



    // Упрощенный тест
    static testConversion() {
        const testCode = `
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
  Serial.println("Hello");
}
        `;

        return this.convert(testCode);
    }
}

// Глобальные функции
window.CodeToBlocksConverter = CodeToBlocksConverter;

// Функция для немедленного тестирования
window.testCodeToBlocks = function() {
    if (window.CodeToBlocksConverter && window.workspace) {
        CodeToBlocksConverter.setWorkspace(window.workspace);
        const success = CodeToBlocksConverter.testConversion();
        if (success) {
            alert('Тест преобразования завершен. Проверьте консоль для подробностей.');
        } else {
            alert('Тест преобразования не удался.');
        }
    } else {
        alert('Конвертер или workspace не инициализирован');
    }
};

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.workspace) {
            CodeToBlocksConverter.init();
            console.log('CodeToBlocksConverter auto-initialized');
        }
    }, 1000);
});