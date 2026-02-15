// tabManager.js - улучшенная версия с правильной обработкой областей видимости
class TabManager {
    constructor() {
        this.indentSize = 2;
        this.indentString = ' '.repeat(this.indentSize);
    }

//    insertTab(editor) {
//        const start = editor.selectionStart;
//        const end = editor.selectionEnd;
//
//        // Вставляем отступ
//        editor.value = editor.value.substring(0, start) +
//                       this.indentString +
//                       editor.value.substring(end);
//
//        // Устанавливаем курсор после отступа
//        editor.selectionStart = editor.selectionEnd = start + this.indentString.length;
//
//        // Возвращаем true чтобы показать, что таб был вставлен
//        return true;
//    }

    handleEnterKey(editor) {
        const cursorPos = editor.selectionStart;
        const value = editor.value;
        const textBeforeCursor = value.substring(0, cursorPos);

        // Проверяем, находимся ли мы внутри функции
        if (!this.isInsideFunction(textBeforeCursor)) {
            // Если не внутри функции, просто вставляем перенос строки
            editor.value = value.substring(0, cursorPos) + '\n' + value.substring(cursorPos);
            editor.selectionStart = editor.selectionEnd = cursorPos + 1;
            return true;
        }

        // Получаем текущую строку
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines[lines.length - 1] || '';

        // Вычисляем текущий отступ
        const currentIndent = this.getCurrentIndent(currentLine);

        // Определяем, нужно ли увеличивать отступ
        const shouldIncreaseIndent = this.shouldIncreaseIndent(currentLine);
        const shouldDecreaseIndent = this.shouldDecreaseIndent(currentLine);

        let newIndent = currentIndent;

        if (shouldIncreaseIndent) {
            newIndent += this.indentSize;
        } else if (shouldDecreaseIndent) {
            newIndent = Math.max(0, newIndent - this.indentSize);
        }

        // Создаем новую строку с правильным отступом
        const newLine = '\n' + ' '.repeat(newIndent);

        // Вставляем новую строку
        editor.value = value.substring(0, cursorPos) +
                      newLine +
                      value.substring(cursorPos);

        // Устанавливаем курсор после отступа
        editor.selectionStart = editor.selectionEnd = cursorPos + newLine.length;

        // Возвращаем true чтобы показать, что Enter был обработан
        return true;
    }

    // НОВЫЙ МЕТОД: Проверка, находимся ли мы внутри функции
    isInsideFunction(textBeforeCursor) {
        const lines = textBeforeCursor.split('\n');
        let braceCount = 0;
        let inFunction = false;
        let inMultiLineComment = false;
        let inString = false;
        let quoteChar = null;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Обработка многострочных комментариев
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

            // Пропускаем однострочные комментарии
            if (line.startsWith('//')) {
                continue;
            }

            // Удаление inline комментариев
            line = line.split('//')[0].trim();

            // Обработка строк
            for (let j = 0; j < line.length; j++) {
                const char = line[j];

                if (inString) {
                    if (char === quoteChar && line[j-1] !== '\\') {
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

                // Подсчет фигурных скобок (игнорируем в строках и комментариях)
                if (char === '{') {
                    braceCount++;
                    // Если это первая открывающая скобка после объявления функции
                    if (braceCount === 1 && this.isFunctionDeclaration(line)) {
                        inFunction = true;
                    }
                } else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        inFunction = false;
                    }
                }
            }
        }

        return inFunction && braceCount > 0;
    }

    // НОВЫЙ МЕТОД: Проверка, является ли строка объявлением функции
    isFunctionDeclaration(line) {
        const functionPatterns = [
            /^(void|int|float|double|boolean|byte|char|String|long|unsigned)\s+\w+\s*\([^)]*\)\s*\{/,
            /^(void)\s+(setup|loop)\s*\(\s*\)\s*\{/,
            /^(\w+)\s+\w+\s*\([^)]*\)\s*\{/ // для классов и других типов
        ];

        return functionPatterns.some(pattern => pattern.test(line));
    }

    getCurrentIndent(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }

    shouldIncreaseIndent(line) {
        const trimmedLine = line.trim();

        // Увеличиваем отступ после:
        return (
            trimmedLine.endsWith('{') ||                    // открывающая фигурная скобка
            trimmedLine.endsWith('(') ||                    // открывающая круглая скобка
            trimmedLine.endsWith('[') ||                    // открывающая квадратная скобка
            trimmedLine.startsWith('if') ||                 // условие if
            trimmedLine.startsWith('else') ||               // else
            trimmedLine.startsWith('for') ||                // цикл for
            trimmedLine.startsWith('while') ||              // цикл while
            trimmedLine.startsWith('do') ||                 // цикл do-while
            trimmedLine.startsWith('switch') ||             // switch
            trimmedLine.startsWith('case') ||               // case
            trimmedLine.startsWith('default') ||            // default
            trimmedLine.startsWith('void') ||               // функция
            trimmedLine.startsWith('int') ||                // функция
            trimmedLine.startsWith('float') ||              // функция
            trimmedLine.startsWith('double') ||             // функция
            trimmedLine.startsWith('bool') ||               // функция
            trimmedLine.startsWith('char') ||               // функция
            trimmedLine.startsWith('String') ||             // функция
            trimmedLine.startsWith('class') ||              // класс
            trimmedLine.startsWith('struct') ||             // структура
            trimmedLine.startsWith('enum') ||               // перечисление
            trimmedLine.startsWith('namespace') ||          // пространство имен
            trimmedLine.startsWith('try') ||                // try-catch
            trimmedLine.startsWith('catch') ||              // catch
            /^\s*#(if|ifdef|ifndef|else|elif)\b/.test(line) // препроцессорные директивы
        );
    }

    shouldDecreaseIndent(line) {
        const trimmedLine = line.trim();

        // Уменьшаем отступ перед:
        return (
            trimmedLine.startsWith('}') ||                  // закрывающая фигурная скобка
            trimmedLine.startsWith(')') ||                  // закрывающая круглая скобка
            trimmedLine.startsWith(']') ||                  // закрывающая квадратная скобка
            trimmedLine.startsWith('else') ||               // else
            trimmedLine.startsWith('case') ||               // case
            trimmedLine.startsWith('default') ||            // default
            trimmedLine.startsWith('catch') ||              // catch
            /^\s*#(else|elif|endif)\b/.test(line)          // препроцессорные директивы
        );
    }

    autoCloseBlock(editor, openChar, closeChar) {
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        editor.value = value.substring(0, cursorPos) +
                      openChar + closeChar +
                      value.substring(cursorPos);

        editor.selectionStart = editor.selectionEnd = cursorPos + 1;

        return true;
    }

    // Автоматическое закрытие блоков кода
    autoCloseCodeBlock(editor, blockType) {
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        let blockContent = '';
        let cursorOffset = 0;

        switch (blockType) {
            case 'if':
                blockContent = 'if () {\n    \n}';
                cursorOffset = -3;
                break;
            case 'for':
                blockContent = 'for (int i = 0; i < ; i++) {\n    \n}';
                cursorOffset = -17;
                break;
            case 'while':
                blockContent = 'while () {\n    \n}';
                cursorOffset = -3;
                break;
            case 'do':
                blockContent = 'do {\n    \n} while ();';
                cursorOffset = -3;
                break;
            case 'switch':
                blockContent = 'switch () {\n    case :\n        break;\n    default:\n        break;\n}';
                cursorOffset = -3;
                break;
            case 'function':
                blockContent = 'void functionName() {\n    \n}';
                cursorOffset = -14;
                break;
            default:
                return false;
        }

        editor.value = value.substring(0, cursorPos) +
                      blockContent +
                      value.substring(cursorPos);

        editor.selectionStart = editor.selectionEnd = cursorPos + blockContent.length + cursorOffset;

        return true;
    }

    // Умное определение контекста для автодополнения
    getCurrentContext(editor) {
        const cursorPos = editor.selectionStart;
        const value = editor.value;
        const textBeforeCursor = value.substring(0, cursorPos);

        // Определяем, находимся ли мы внутри строки, комментария и т.д.
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines[lines.length - 1] || '';

        // Проверяем, находимся ли мы в строке
        const inString = this.isInString(textBeforeCursor);

        // Проверяем, находимся ли мы в комментарии
        const inComment = this.isInComment(textBeforeCursor);

        // Определяем текущий блок (функция, цикл, условие)
        const currentBlock = this.getCurrentBlock(textBeforeCursor);

        // Проверяем, находимся ли мы внутри функции
        const insideFunction = this.isInsideFunction(textBeforeCursor);

        return {
            inString,
            inComment,
            currentBlock,
            insideFunction,
            currentLine: currentLine.trim(),
            indentLevel: this.getCurrentIndent(currentLine)
        };
    }

    isInString(text) {
        let inString = false;
        let quoteChar = null;
        let escaped = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (inString) {
                if (char === quoteChar) {
                    inString = false;
                    quoteChar = null;
                }
            } else {
                if (char === '"' || char === "'") {
                    inString = true;
                    quoteChar = char;
                }
            }
        }

        return inString;
    }

    isInComment(text) {
        // Проверка на однострочный комментарий
        const lines = text.split('\n');
        const lastLine = lines[lines.length - 1] || '';
        if (lastLine.includes('//') && !lastLine.includes('"//"') && !lastLine.includes("'//'")) {
            return true;
        }

        // Проверка на многострочный комментарий
        const commentStart = text.lastIndexOf('/*');
        const commentEnd = text.lastIndexOf('*/');

        return commentStart > commentEnd;
    }

    getCurrentBlock(text) {
        const lines = text.split('\n');
        let blockStack = [];
        let inMultiLineComment = false;
        let inString = false;
        let quoteChar = null;

        for (let i = lines.length - 1; i >= 0; i--) {
            let line = lines[i].trim();

            // Обработка комментариев и строк
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

            // Обработка строк
            for (let j = 0; j < line.length; j++) {
                const char = line[j];

                if (inString) {
                    if (char === quoteChar && (j === 0 || line[j-1] !== '\\')) {
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

                // Игнорируем скобки внутри строк
            }

            // Теперь анализируем блоки (игнорируя строки)
            if (line.endsWith('{') && !inString) {
                // Нашли начало блока
                if (line.includes('class ')) return 'class';
                if (line.includes('struct ')) return 'struct';
                if (line.includes('void ') || line.includes('int ') || line.includes('float ') ||
                    line.includes('double ') || line.includes('bool ') || line.includes('char ') ||
                    line.includes('String ')) return 'function';
                if (line.includes('if (')) return 'if';
                if (line.includes('for (')) return 'for';
                if (line.includes('while (')) return 'while';
                if (line.includes('switch (')) return 'switch';
                return 'block';
            }

            if (line.startsWith('}') && !inString && blockStack.length > 0) {
                blockStack.pop();
            }
        }

        return 'global';
    }

    // Форматирование кода (только внутри функций)
    formatCode(editor) {
        const value = editor.value;
        const lines = value.split('\n');
        let indentLevel = 0;
        let formattedLines = [];
        let inMultiLineComment = false;
        let inFunction = false;
        let functionBraceCount = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            const originalLine = lines[i];

            // Пропускаем пустые строки
            if (line === '') {
                formattedLines.push('');
                continue;
            }

            // Обработка многострочных комментариев
            if (inMultiLineComment) {
                formattedLines.push(' '.repeat(indentLevel * this.indentSize) + originalLine.trim());
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                }
                continue;
            }

            if (line.startsWith('/*')) {
                inMultiLineComment = true;
                formattedLines.push(' '.repeat(indentLevel * this.indentSize) + originalLine.trim());
                continue;
            }

            // Пропускаем однострочные комментарии
            if (line.startsWith('//')) {
                formattedLines.push(' '.repeat(indentLevel * this.indentSize) + originalLine.trim());
                continue;
            }

            // Проверяем, находимся ли мы внутри функции
            if (!inFunction && this.isFunctionDeclaration(line)) {
                inFunction = true;
                functionBraceCount = 0;
            }

            // Если не внутри функции, не форматируем отступы
            if (!inFunction) {
                formattedLines.push(originalLine);
                continue;
            }

            // Уменьшаем отступ перед закрывающими скобками
            if (line.startsWith('}') || line.startsWith(')') || line.startsWith(']')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            // Добавляем строку с текущим отступом
            formattedLines.push(' '.repeat(indentLevel * this.indentSize) + line);

            // Увеличиваем отстав после открывающих скобок
            if (line.endsWith('{') || line.endsWith('(') || line.endsWith('[')) {
                indentLevel++;

                // Если это фигурная скобка, увеличиваем счетчик
                if (line.endsWith('{')) {
                    functionBraceCount++;
                }
            }

            // Уменьшаем отступ для else, catch и т.д.
            if (line.startsWith('else') || line.startsWith('catch') ||
                line.startsWith('case') || line.startsWith('default')) {
                indentLevel = Math.max(0, indentLevel - 1);
                // Переформатируем строку с новым отступом
                formattedLines[formattedLines.length - 1] = ' '.repeat(indentLevel * this.indentSize) + line;
            }

            // Проверяем, закончилась ли функция
            if (line.startsWith('}') && inFunction) {
                functionBraceCount--;
                if (functionBraceCount === 0) {
                    inFunction = false;
                }
            }
        }

        editor.value = formattedLines.join('\n');
        return true;
    }

    // Умная вставка - определяет контекст и вставляет соответствующий блок
    smartInsert(editor, text) {
        const context = this.getCurrentContext(editor);
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        // Если находимся в строке или комментарии, вставляем как есть
        if (context.inString || context.inComment) {
            editor.value = value.substring(0, cursorPos) + text + value.substring(cursorPos);
            editor.selectionStart = editor.selectionEnd = cursorPos + text.length;
            return true;
        }

        // Если не внутри функции, вставляем как есть
        if (!context.insideFunction) {
            editor.value = value.substring(0, cursorPos) + text + value.substring(cursorPos);
            editor.selectionStart = editor.selectionEnd = cursorPos + text.length;
            return true;
        }

        // Автоматическое закрытие блоков для ключевых слов
        const blockKeywords = {
            'if': 'if',
            'for': 'for',
            'while': 'while',
            'do': 'do',
            'switch': 'switch'
        };

        for (const [keyword, blockType] of Object.entries(blockKeywords)) {
            if (text.trim() === keyword) {
                return this.autoCloseCodeBlock(editor, blockType);
            }
        }

        // Обычная вставка
        editor.value = value.substring(0, cursorPos) + text + value.substring(cursorPos);
        editor.selectionStart = editor.selectionEnd = cursorPos + text.length;
        return true;
    }


    // Умное изменение отступов при выделении
    handleSelectionTab(editor, isShiftTab = false) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;

        // Определяем, какие строки попали в выделение
        const lines = value.split('\n');
        const beforeSelection = value.substring(0, start);
        const selectedText = value.substring(start, end);

        const startLine = beforeSelection.split('\n').length - 1;
        const endLine = startLine + selectedText.split('\n').length - 1;

        // Изменяем отступы для выбранных строк
        for (let i = startLine; i <= endLine; i++) {
            if (isShiftTab) {
                // Удаление отступа
                if (lines[i].startsWith(this.indentString)) {
                    lines[i] = lines[i].substring(this.indentString.length);
                } else if (lines[i].startsWith('  ')) {
                    lines[i] = lines[i].substring(2);
                }
            } else {
                // Добавление отступа
                lines[i] = this.indentString + lines[i];
            }
        }

        // Обновляем текст
        const newValue = lines.join('\n');
        editor.value = newValue;

        // Пересчитываем позицию выделения
        const newLines = newValue.split('\n');
        let newStart = 0;
        let newEnd = 0;

        for (let i = 0; i < startLine; i++) {
            newStart += newLines[i].length + 1;
        }

        for (let i = 0; i <= endLine; i++) {
            newEnd += newLines[i].length + 1;
        }
        newEnd--; // Убираем последний перенос строки

        editor.selectionStart = newStart;
        editor.selectionEnd = newEnd;

        return true;
    }
}