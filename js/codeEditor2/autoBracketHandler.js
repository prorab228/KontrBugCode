// autoBracketHandler.js - убедитесь, что класс доступен глобально
class AutoBracketHandler {
    static autoCloseBrackets(e) {
        const editor = e.target;
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'",
            '`': '`'
        };

        const insertedChar = e.data;

        if (insertedChar && pairs[insertedChar]) {
            const closingChar = pairs[insertedChar];
            const nextChar = value[cursorPos];

            // Проверяем, что следующий символ не такой же (чтобы не дублировать)
            if (nextChar !== closingChar) {
                // Вставляем закрывающий символ
                editor.value = value.substring(0, cursorPos) +
                              closingChar +
                              value.substring(cursorPos);

                // Возвращаем курсор между скобками
                editor.selectionStart = cursorPos;
                editor.selectionEnd = cursorPos;
            }

            if (window.CodeEditor && window.CodeEditor.highlightCode) {
                window.CodeEditor.highlightCode(editor.value);
            }
        }
    }

    static autoCloseBlocks(editor, blockType) {
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        let openChar, closeChar;

        switch (blockType) {
            case 'curly':
                openChar = '{';
                closeChar = '}';
                break;
            case 'paren':
                openChar = '(';
                closeChar = ')';
                break;
            case 'bracket':
                openChar = '[';
                closeChar = ']';
                break;
            default:
                return;
        }

        // Проверяем, есть ли уже закрывающий символ
        const nextChar = value[cursorPos];
        if (nextChar !== closeChar) {
            editor.value = value.substring(0, cursorPos) +
                          closeChar +
                          value.substring(cursorPos);

            // Возвращаем курсор между скобками
            editor.selectionStart = editor.selectionEnd = cursorPos;
        }

        if (window.CodeEditor && window.CodeEditor.highlightCode) {
            window.CodeEditor.highlightCode(editor.value);
        }
    }

    static handleBackspace(e) {
        const editor = e.target;
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'"
        };

        // Проверяем, удаляем ли мы парную скобку
        if (cursorPos > 0 && cursorPos < value.length) {
            const prevChar = value[cursorPos - 1];
            const nextChar = value[cursorPos];

            if (pairs[prevChar] === nextChar) {
                // Удаляем обе скобки
                editor.value = value.substring(0, cursorPos - 1) +
                              value.substring(cursorPos + 1);
                editor.selectionStart = editor.selectionEnd = cursorPos - 1;
                e.preventDefault();
                if (window.CodeEditor && window.CodeEditor.highlightCode) {
                    window.CodeEditor.highlightCode(editor.value);
                }
            }
        }
    }
}

// Делаем класс доступным глобально
window.AutoBracketHandler = AutoBracketHandler;