// ErrorChecker.js - исправленная версия
class ErrorChecker {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.infos = [];
    }

    checkCode(code) {
        this.errors = [];
        this.warnings = [];
        this.infos = [];

        this.checkSyntaxErrors(code);
        this.checkCommonMistakes(code);
        this.checkStyleIssues(code);
        this.checkArduinoSpecific(code);

        return {
            errors: this.errors,
            warnings: this.warnings,
            infos: this.infos
        };
    }

    checkSyntaxErrors(code) {
        const lines = code.split('\n');
        let inMultiLineComment = false;
        let inString = false;
        let quoteChar = null;
        let braceStack = [];
        let parenStack = [];
        let bracketStack = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const trimmedLine = line.trim();

            // Пропускаем пустые строки
            if (trimmedLine === '') continue;

            // Обработка многострочных комментариев
            if (inMultiLineComment) {
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                }
                continue;
            }

            if (line.includes('/*')) {
                inMultiLineComment = true;
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                } else {
                    continue;
                }
            }

            // Пропускаем однострочные комментарии
            if (trimmedLine.startsWith('//')) {
                continue;
            }

            // Проверка строк
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const prevChar = j > 0 ? line[j-1] : '';

                if (inString) {
                    if (char === quoteChar && prevChar !== '\\') {
                        inString = false;
                        quoteChar = null;
                    }
                    continue;
                }

                if (char === '"' || char === "'") {
                    inString = true;
                    quoteChar = char;
                    continue;
                }

                // Проверка скобок
                switch (char) {
                    case '{':
                        braceStack.push({ line: lineNumber, column: j });
                        break;
                    case '}':
                        if (braceStack.length === 0) {
                            this.errors.push({
                                line: lineNumber,
                                column: j,
                                message: 'Лишняя закрывающая фигурная скобка',
                                severity: 'error',
                                type: 'syntax'
                            });
                        } else {
                            braceStack.pop();
                        }
                        break;
                    case '(':
                        parenStack.push({ line: lineNumber, column: j });
                        break;
                    case ')':
                        if (parenStack.length === 0) {
                            this.errors.push({
                                line: lineNumber,
                                column: j,
                                message: 'Лишняя закрывающая круглая скобка',
                                severity: 'error',
                                type: 'syntax'
                            });
                        } else {
                            parenStack.pop();
                        }
                        break;
                    case '[':
                        bracketStack.push({ line: lineNumber, column: j });
                        break;
                    case ']':
                        if (bracketStack.length === 0) {
                            this.errors.push({
                                line: lineNumber,
                                column: j,
                                message: 'Лишняя закрывающая квадратная скобка',
                                severity: 'error',
                                type: 'syntax'
                            });
                        } else {
                            bracketStack.pop();
                        }
                        break;
                }
            }

            // Проверка точки с запятой
            if (!inString && !inMultiLineComment) {
                const isConditionWithoutBody = /^(if|for|while|switch)\s*\([^)]*\)\s*$/.test(trimmedLine);
                if (!isConditionWithoutBody) {
                    this.checkSemicolon(line, lineNumber);
                }
            }

            // Проверка директив препроцессора
            this.checkPreprocessorDirectives(trimmedLine, lineNumber);
        }

        // Проверка незакрытых скобок
        braceStack.forEach(brace => {
            this.errors.push({
                line: brace.line,
                column: brace.column,
                message: 'Незакрытая фигурная скобка',
                severity: 'error',
                type: 'syntax'
            });
        });

        parenStack.forEach(paren => {
            this.errors.push({
                line: paren.line,
                column: paren.column,
                message: 'Незакрытая круглая скобка',
                severity: 'error',
                type: 'syntax'
            });
        });

        bracketStack.forEach(bracket => {
            this.errors.push({
                line: bracket.line,
                column: bracket.column,
                message: 'Незакрытая квадратная скобка',
                severity: 'error',
                type: 'syntax'
            });
        });

        // Проверка незакрытых строк и комментариев
        if (inString) {
            this.errors.push({
                line: lines.length,
                column: 0,
                message: 'Незакрытая строка',
                severity: 'error',
                type: 'syntax'
            });
        }

        if (inMultiLineComment) {
            this.errors.push({
                line: lines.length,
                column: 0,
                message: 'Незакрытый многострочный комментарий',
                severity: 'warning',
                type: 'syntax'
            });
        }
    }

    checkSemicolon(line, lineNumber) {
        const trimmedLine = line.trim();

        // Паттерны, где точка с запятой не требуется
        const noSemicolonPatterns = [
            /^#/,                          // директивы препроцессора
            /^{/,                           // открывающая фигурная скобка
            /^}$/,                          // закрывающая фигурная скобка
            /^\/\//,                        // комментарии
            /^\/\*/,                        // начало многострочного комментария
            /\*\/$/,                        // конец многострочного комментария

            // Ключевые слова без тела в одной строке
            /^if\s*\([^)]*\)\s*$/,          // if с условием (без тела в той же строке)
            /^for\s*\([^)]*\)\s*$/,         // for с условием
            /^while\s*\([^)]*\)\s*$/,       // while с условием
            /^switch\s*\([^)]*\)\s*$/,      // switch с условием

            // Ключевые слова без условий
            /^(else|do|case|default)\b\s*$/,
            /^{.*}$/                        // блоки кода в одной строке
        ];

        // Паттерны, где точка с запятой ТРЕБУЕТСЯ (если её нет - ошибка)
        const requiresSemicolonPatterns = [
            // Объявления переменных с присваиванием
            /^(int|float|double|bool|char|String|byte|long|unsigned|const|static)\s+\w+\s*=\s*[^;]*$/,
            // Объявления переменных без присваивания
            /^(int|float|double|bool|char|String|byte|long|unsigned|const|static)\s+\w+\s*;?$/,
            // Присваивания (не в условиях)
            /^(?!if|for|while|switch)(\w+)\s*=\s*[^;]*$/,
            // Вызовы функций
            /^\w+\([^)]*\)$/,
            // return, break, continue
            /^return\b[^;]*$/,
            /^break\b\s*$/,
            /^continue\b\s*$/,
            // Пустая инструкция
            /^;\s*$/
        ];

        // ИСКЛЮЧЕНИЯ: строки, которые должны игнорироваться полностью
        // 1. Объявления функций (с возвращаемым типом)
        const isFunctionDeclaration = /^(void|int|float|double|bool|char|String|byte|long|unsigned)\s+\w+\s*\([^)]*\)\s*\{/.test(trimmedLine);
        // 2. Уже заканчивается точкой с запятой и является корректным объявлением
        const isVariableDeclarationWithSemicolon = /^(int|float|double|bool|char|String|byte|long|unsigned|const|static)\s+\w+\s*(=\s*[^;]+)?;\s*$/.test(trimmedLine);

        // Если это объявление переменной с точкой с запятой - это корректно, не выдаем предупреждения
        if (isVariableDeclarationWithSemicolon) {
            return;
        }

        // Если это объявление функции - не проверяем точку с запятой
        if (isFunctionDeclaration) {
            return;
        }

        // Проверяем, является ли строка условием без тела
        const isConditionalStatement = /^(if|for|while|switch)\s*\([^)]*\)\s*$/.test(trimmedLine);

        // Если это условие без тела - точка с запятой не требуется
        if (isConditionalStatement) {
            // Но проверяем, нет ли лишней точки с запятой
            if (trimmedLine.endsWith(';')) {
                this.warnings.push({
                    line: lineNumber,
                    column: trimmedLine.length - 1,
                    message: 'Лишняя точка с запятой после условия',
                    severity: 'warning',
                    type: 'style'
                });
            }
            return; // Выходим из проверки
        }

        // Исключаем строки, которые заканчиваются закрывающей скобкой блока
        if (trimmedLine.endsWith('}')) {
            return;
        }

        // Исключаем директивы препроцессора
        if (trimmedLine.startsWith('#')) {
            return;
        }

        // Исключаем объявления классов, структур, enum
        if (/^(class|struct|enum)\b/.test(trimmedLine)) {
            return;
        }

        // Проверяем, нужна ли точка с запятой
        const shouldHaveSemicolon = requiresSemicolonPatterns.some(pattern =>
            pattern.test(trimmedLine) && !trimmedLine.endsWith(';')
        );

        const shouldNotHaveSemicolon = noSemicolonPatterns.some(pattern =>
            pattern.test(trimmedLine) && trimmedLine.endsWith(';')
        );

        // Если это присваивание в условии (например, в for), то не требуем точку с запятой
        const isAssignmentInLoopInitialization = /^for\s*\(.*=.*;/.test(trimmedLine);
        if (isAssignmentInLoopInitialization) {
            return;
        }

        if (shouldHaveSemicolon && !trimmedLine.endsWith('{') && !trimmedLine.endsWith('}')) {
            this.errors.push({
                line: lineNumber,
                column: trimmedLine.length,
                message: 'Отсутствует точка с запятой',
                severity: 'error',
                type: 'syntax'
            });
        }

        if (shouldNotHaveSemicolon && trimmedLine.endsWith(';')) {
            this.warnings.push({
                line: lineNumber,
                column: trimmedLine.length - 1,
                message: 'Лишняя точка с запятой',
                severity: 'warning',
                type: 'style'
            });
        }
    }

    checkPreprocessorDirectives(line, lineNumber) {
        if (line.startsWith('#')) {
            const validDirectives = [
                'include', 'define', 'ifdef', 'ifndef', 'if', 'else',
                'elif', 'endif', 'error', 'warning', 'pragma'
            ];

            const directiveMatch = line.match(/^#\s*(\w+)/);
            if (directiveMatch) {
                const directive = directiveMatch[1].toLowerCase();
                if (!validDirectives.includes(directive)) {
                    this.errors.push({
                        line: lineNumber,
                        column: 0,
                        message: `Неизвестная директива препроцессора: #${directive}`,
                        severity: 'error',
                        type: 'syntax'
                    });
                }
            }

            // Проверка #include
            if (line.startsWith('#include')) {
                const includeMatch = line.match(/#include\s+[<"]([^>"]+)[>"]/);
                if (!includeMatch) {
                    this.errors.push({
                        line: lineNumber,
                        column: 0,
                        message: 'Неправильный формат директивы #include',
                        severity: 'error',
                        type: 'syntax'
                    });
                }
            }
        }
    }

    checkCommonMistakes(code) {
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const trimmedLine = line.trim();

            // Пропускаем комментарии и пустые строки
            if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
                continue;
            }

            // Удаляем inline комментарии для анализа
            const lineWithoutComments = trimmedLine.split('//')[0].trim();
            if (!lineWithoutComments) continue;

            // 1. Проверка на присваивание в условии if (только внутри if)
            if (lineWithoutComments.startsWith('if')) {
                const ifMatch = lineWithoutComments.match(/if\s*\(([^)]*)\)/);
                if (ifMatch) {
                    const condition = ifMatch[1];
                    // Проверяем наличие одиночного = (присваивание) в условии
                    // Но игнорируем случаи с ==, !=, <=, >=
                    const assignmentMatches = this.findAssignmentInCondition(condition);
                    assignmentMatches.forEach(match => {
                        this.warnings.push({
                            line: lineNumber,
                            column: lineWithoutComments.indexOf('(') + match.pos + 1,
                            message: 'Возможно, в условии if используется присваивание (=) вместо сравнения (==)',
                            severity: 'warning',
                            type: 'logic'
                        });
                    });
                }
            }

            // 2. Проверка на присваивание в условии while (только внутри while)
            if (lineWithoutComments.startsWith('while')) {
                const whileMatch = lineWithoutComments.match(/while\s*\(([^)]*)\)/);
                if (whileMatch) {
                    const condition = whileMatch[1];
                    const assignmentMatches = this.findAssignmentInCondition(condition);
                    assignmentMatches.forEach(match => {
                        this.warnings.push({
                            line: lineNumber,
                            column: lineWithoutComments.indexOf('(') + match.pos + 1,
                            message: 'Возможно, в условии while используется присваивание (=) вместо сравнения (==)',
                            severity: 'warning',
                            type: 'logic'
                        });
                    });
                }
            }

            // 3. ОСОБАЯ ОБРАБОТКА ДЛЯ FOR: проверяем только условие (вторую часть)
            if (lineWithoutComments.startsWith('for')) {
                const forMatch = lineWithoutComments.match(/for\s*\(([^)]*)\)/);
                if (forMatch) {
                    const forParts = forMatch[1].split(';');
                    if (forParts.length >= 2) {
                        const initialization = forParts[0].trim();
                        const condition = forParts[1].trim();
                        const increment = forParts[2] ? forParts[2].trim() : '';

                        // Проверяем только условие (вторую часть)
                        if (condition && condition !== '') {
                            const assignmentMatches = this.findAssignmentInCondition(condition);
                            assignmentMatches.forEach(match => {
                                // Считаем позицию с учетом инициализации
                                const conditionStart = forMatch[1].indexOf(condition);
                                const positionInLine = lineWithoutComments.indexOf('(') +
                                                      forMatch[1].indexOf(condition) +
                                                      match.pos + 1;
                                this.warnings.push({
                                    line: lineNumber,
                                    column: positionInLine,
                                    message: 'Возможно, в условии цикла for используется присваивание (=) вместо сравнения (==)',
                                    severity: 'warning',
                                    type: 'logic'
                                });
                            });
                        }
                    }
                }
            }

            // 4. Проверка на неиспользуемые переменные (базовая)
            const variableDeclarations = lineWithoutComments.match(/(int|float|double|bool|boolean|char|String|byte|long|unsigned)\s+(\w+)\s*[;=]/);
            if (variableDeclarations && !lineWithoutComments.includes('const')) {
                const varName = variableDeclarations[2];

                // Игнорируем стандартные имена переменных
                const ignoredNames = ['rs', 'en', 'd4', 'd5', 'd6', 'd7', 'pin', 'led', 'button',
                                      'i', 'j', 'k', 'x', 'y', 'z', 'temp', 'val', 'counter'];

                if (!ignoredNames.includes(varName)) {
                    const varUsage = new RegExp(`\\b${varName}\\b`, 'g');
                    const usageCount = (code.match(varUsage) || []).length;

                    // Если переменная используется только в объявлении (1 раз)
                    if (usageCount === 1) {
                        this.warnings.push({
                            line: lineNumber,
                            column: lineWithoutComments.indexOf(varName),
                            message: `Переменная '${varName}' объявлена, но не используется`,
                            severity: 'warning',
                            type: 'unused'
                        });
                    }
                }
            }

//            // 5. Проверка на присваивание константе (без const)
//            const constPattern = /([a-zA-Z_]\w*)\s*=\s*([^;]+);/;
//            const constMatch = lineWithoutComments.match(constPattern);
//            if (constMatch && !lineWithoutComments.includes('const')) {
//                const leftSide = constMatch[1];
//                const rightSide = constMatch[2];
//
//                // Проверяем, является ли правая часть числовой константой или строкой
//                const isConstant = /^\s*(\d+|'.'|".*"|true|false|NULL|null)\s*$/.test(rightSide);
//                if (isConstant) {
//                    this.infos.push({
//                        line: lineNumber,
//                        column: lineWithoutComments.indexOf(leftSide),
//                        message: `Переменная '${leftSide}' инициализируется константой. Рассмотрите использование 'const'`,
//                        severity: 'info',
//                        type: 'style'
//                    });
//                }
//            }
        }
    }

    // Новый вспомогательный метод для поиска присваиваний в условиях
    findAssignmentInCondition(condition) {
        const matches = [];
        let depth = 0; // для учета вложенных скобок
        let inString = false;
        let stringChar = null;
        let escaped = false;

        for (let i = 0; i < condition.length; i++) {
            const char = condition[i];

            // Обработка escape-символов в строках
            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            // Учет строковых литералов
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
                continue;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = null;
                continue;
            }

            if (inString) continue;

            // Учет скобок
            if (char === '(') depth++;
            else if (char === ')') depth--;

            // Ищем одиночное = (присваивание) только на верхнем уровне скобок
            if (depth === 0 && char === '=') {
                // Проверяем, не является ли это частью оператора сравнения
                const prevChar = i > 0 ? condition[i - 1] : '';
                const nextChar = i < condition.length - 1 ? condition[i + 1] : '';

                const isComparison = (prevChar === '=' || prevChar === '!' ||
                                     prevChar === '<' || prevChar === '>') ||
                                     (nextChar === '=');

                const isCompound = (prevChar === '+' || prevChar === '-' ||
                                   prevChar === '*' || prevChar === '/' ||
                                   prevChar === '%' || prevChar === '&' ||
                                   prevChar === '|' || prevChar === '^' ||
                                   prevChar === '>' || prevChar === '<');

                if (!isComparison && !isCompound) {
                    // Проверяем, что это не часть логического оператора (==, !=, <=, >=)
                    const context = condition.substring(Math.max(0, i - 2), Math.min(condition.length, i + 3));
                    if (!/==|!=|<=|>=/.test(context)) {
                        matches.push({
                            pos: i,
                            char: char
                        });
                    }
                }
            }
        }

        return matches;
    }



    checkStyleIssues(code) {
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Проверка длины строки
            if (line.length > 100) { // Увеличил лимит до 100 символов
                this.warnings.push({
                    line: lineNumber,
                    column: 100,
                    message: 'Строка слишком длинная (больше 100 символов)',
                    severity: 'warning',
                    type: 'style'
                });
            }

            // Проверка табов вместо пробелов
            if (line.includes('\t')) {
                this.warnings.push({
                    line: lineNumber,
                    column: line.indexOf('\t'),
                    message: 'Используются табы вместо пробелов',
                    severity: 'warning',
                    type: 'style'
                });
            }

            // Проверка лишних пробелов в конце строки
            if (line.endsWith(' ') && line.trim() !== '') {
                this.warnings.push({
                    line: lineNumber,
                    column: line.length - 1,
                    message: 'Лишние пробелы в конце строки',
                    severity: 'warning',
                    type: 'style'
                });
            }

            // Проверка отступов
            const expectedIndent = this.calculateExpectedIndent(lines, i);
            const actualIndent = line.match(/^(\s*)/)[1].length;

            if (actualIndent !== expectedIndent && line.trim() !== '') {
                // Игнорируем небольшие расхождения
                if (Math.abs(actualIndent - expectedIndent) > 2) {
                    this.warnings.push({
                        line: lineNumber,
                        column: 0,
                        message: `Неправильный отступ: ожидается ${expectedIndent}, найдено ${actualIndent}`,
                        severity: 'warning',
                        type: 'style'
                    });
                }
            }
        }
    }

    calculateExpectedIndent(lines, currentLineIndex) {
        let indentLevel = 0;

        for (let i = 0; i < currentLineIndex; i++) {
            const line = lines[i].trim();

            if (line.endsWith('{') || line.endsWith('(') || line.endsWith('[')) {
                indentLevel++;
            }

            if (line.startsWith('}') || line.startsWith(')') || line.startsWith(']')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
        }

        return indentLevel * 2; // 2 пробела на уровень отступа
    }

    checkArduinoSpecific(code) {
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const trimmedLine = line.trim();

            // Проверка на использование setup() и loop()
//            if (trimmedLine.includes('setup()') && !trimmedLine.includes('void setup()')) {
//                this.infos.push({
//                    line: lineNumber,
//                    column: trimmedLine.indexOf('setup()'),
//                    message: 'Функция setup() должна быть объявлена как void setup()',
//                    severity: 'info',
//                    type: 'arduino'
//                });
//            }
//
//            if (trimmedLine.includes('loop()') && !trimmedLine.includes('void loop()')) {
//                this.infos.push({
//                    line: lineNumber,
//                    column: trimmedLine.indexOf('loop()'),
//                    message: 'Функция loop() должна быть объявлена как void loop()',
//                    severity: 'info',
//                    type: 'arduino'
//                });
//            }

            // Проверка на использование pinMode в setup
            if (trimmedLine.includes('pinMode') && !this.isInSetupFunction(lines, i)) {
                this.warnings.push({
                    line: lineNumber,
                    column: trimmedLine.indexOf('pinMode'),
                    message: 'pinMode() рекомендуется вызывать в функции setup()',
                    severity: 'info',
                    type: 'arduino'
                });
            }

            // Проверка на использование delay в loop
            if (trimmedLine.includes('delay(') && this.isInLoopFunction(lines, i)) {
                this.infos.push({
                    line: lineNumber,
                    column: trimmedLine.indexOf('delay'),
                    message: 'Использование delay() в loop() может блокировать выполнение кода',
                    severity: 'info',
                    type: 'arduino'
                });
            }
        }
    }

    isInSetupFunction(lines, currentLineIndex) {
        return this.isInFunction(lines, currentLineIndex, 'setup');
    }

    isInLoopFunction(lines, currentLineIndex) {
        return this.isInFunction(lines, currentLineIndex, 'loop');
    }

    isInFunction(lines, currentLineIndex, functionName) {
        let inFunction = false;
        let braceCount = 0;

        for (let i = 0; i <= currentLineIndex; i++) {
            const line = lines[i].trim();

            if (line === `void ${functionName}() {`) {
                inFunction = true;
                braceCount = 1;
                continue;
            }

            if (inFunction) {
                if (line.includes('{')) braceCount++;
                if (line.includes('}')) braceCount--;

                if (braceCount === 0) {
                    inFunction = false;
                }
            }
        }

        return inFunction;
    }

    // Метод для быстрой проверки без детального анализа
    quickCheck(code) {
        const lines = code.split('\n');
        const issues = [];

        // Быстрая проверка незакрытых скобок
        let openBraces = 0;
        let openParens = 0;
        let openBrackets = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            for (let j = 0; j < line.length; j++) {
                const char = line[j];

                switch (char) {
                    case '{': openBraces++; break;
                    case '}': openBraces--; break;
                    case '(': openParens++; break;
                    case ')': openParens--; break;
                    case '[': openBrackets++; break;
                    case ']': openBrackets--; break;
                }
            }

            // Проверка точки с запятой в конце строк
            const trimmedLine = line.trim();
            if (trimmedLine &&
                !trimmedLine.endsWith(';') &&
                !trimmedLine.endsWith('{') &&
                !trimmedLine.endsWith('}') &&
                !trimmedLine.startsWith('#') &&
                !trimmedLine.startsWith('//') &&
                !trimmedLine.startsWith('/*') &&
                !trimmedLine.includes(' if ') &&
                !trimmedLine.includes(' for ') &&
                !trimmedLine.includes(' while ') &&
                !trimmedLine.includes(' void ') &&
                !trimmedLine.startsWith('else') &&
                !trimmedLine.startsWith('const')) { // Игнорируем объявления констант

                issues.push({
                    line: i + 1,
                    column: trimmedLine.length,
                    message: 'Возможно, отсутствует точка с запятой',
                    severity: 'warning',
                    type: 'quick'
                });
            }
        }

        if (openBraces > 0) {
            issues.push({
                line: lines.length,
                column: 0,
                message: 'Незакрытые фигурные скобки',
                severity: 'error',
                type: 'quick'
            });
        }

        if (openParens > 0) {
            issues.push({
                line: lines.length,
                column: 0,
                message: 'Незакрытые круглые скобки',
                severity: 'error',
                type: 'quick'
            });
        }

        if (openBrackets > 0) {
            issues.push({
                line: lines.length,
                column: 0,
                message: 'Незакрытые квадратные скобки',
                severity: 'error',
                type: 'quick'
            });
        }

        return issues;
    }
}