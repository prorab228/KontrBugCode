class AutocompleteManager {
    constructor() {
        this.container = this.createContainer();
        this.isVisible = false;
        this.selectedIndex = 0;
        this.currentSuggestions = [];
        this.libraryProviderInitialized = false;

        this.providers = [
            new CoreArduinoProvider(),
            new UserCodeProvider()
        ];

        this.libraryProvider = null;

        document.body.appendChild(this.container);

        this.initLibraryProvider();
    }

    async initLibraryProvider() {
        try {
            if (typeof EnhancedDynamicLibraryProvider === 'undefined') {
                setTimeout(() => this.initLibraryProvider(), 100);
                return;
            }

            this.libraryProvider = new EnhancedDynamicLibraryProvider();
            this.providers.push(this.libraryProvider);

            const projectPath = window.projectPath || '.';
            await this.libraryProvider.init(projectPath);

            this.libraryProviderInitialized = true;
            console.log('Library provider initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize library provider:', error);
            this.libraryProviderInitialized = true;
        }
    }

   check(code, editor) {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = code.substring(0, cursorPos);

        this.updateFromCode(code);

        // УЛУЧШЕННАЯ обработка для include
        const includeMatch = textBeforeCursor.match(/#include\s*[<"]?([^<">]*)$/);
        if (includeMatch) {
            console.log('Include directive detected');
            this.handleIncludeAutocomplete(textBeforeCursor, editor);
            return;
        }

        // Обычная обработка для методов и переменных
        const matches = textBeforeCursor.match(/([\w.]+\.\w*|\w+)$/);

        if (matches) {
            const currentWord = matches[0];
            console.log(`Current word: "${currentWord}"`);

            // ПОКАЗЫВАТЬ АВТОДОПОЛНЕНИЕ ВСЕГДА
            if (currentWord.length > 0) {
                this.show(currentWord, editor);
            } else {
                this.hide();
            }
        } else {
            this.hide();
        }
    }

handleIncludeAutocomplete(textBeforeCursor, editor) {
    const includeMatch = textBeforeCursor.match(/#include\s*[<"]?([^<">]*)$/);
    if (includeMatch) {
        const currentInclude = includeMatch[1] || '';
        console.log(`Include autocomplete for: "${currentInclude}"`);

        this.currentSuggestions = [];

        // Получаем подсказки от всех провайдеров
        this.providers.forEach(provider => {
            const suggestions = provider.getSuggestions(`#include ${currentInclude}`);
            console.log(`Provider ${provider.constructor.name} returned ${suggestions.length} suggestions`);

            // Фильтруем include подсказки
            const includeSuggestions = suggestions.filter(s =>
                s.type === 'include' &&
                s.matchText.toLowerCase().includes(currentInclude.toLowerCase())
            );

            console.log(`Filtered include suggestions:`, includeSuggestions);
            this.currentSuggestions.push(...includeSuggestions);
        });

        // Убираем дубликаты
        this.currentSuggestions = this.removeDuplicateSuggestions(this.currentSuggestions);
        console.log(`Final include suggestions: ${this.currentSuggestions.length}`);

        if (this.currentSuggestions.length > 0) {
            this.renderSuggestions(currentInclude);
            this.container.style.display = 'block';
            this.isVisible = true;
            this.positionContainer(editor);
        } else {
            console.log('No include suggestions found');
            this.hide();
        }
    } else {
        console.log('No include match found');
        this.hide();
    }
}

    updateFromCode(code) {
        this.providers.forEach(provider => {
            if (provider.updateFromCode) {
                provider.updateFromCode(code);
            }
        });
    }

    show(currentWord, editor) {
        this.currentSuggestions = [];
        console.log(`Showing suggestions for: "${currentWord}"`);

        if (currentWord.includes('.')) {
            const parts = currentWord.split('.');
            if (parts.length === 2) {
                const [objectName, methodPart] = parts;
                console.log(`Object: "${objectName}", Method part: "${methodPart}"`);
                this.currentSuggestions = this.getMethodSuggestions(objectName, methodPart);
            }
        } else {
            // Подсказки для переменных и функций
            this.providers.forEach(provider => {
                const suggestions = provider.getSuggestions(currentWord);
                // Фильтруем ненужные подсказки
                const filteredSuggestions = suggestions.filter(s =>
                    !s.type.includes('include') &&
                    s.matchText.toLowerCase().startsWith(currentWord.toLowerCase())
                );
                this.currentSuggestions.push(...filteredSuggestions);
            });
        }

        // Убираем дубликаты
        this.currentSuggestions = this.removeDuplicateSuggestions(this.currentSuggestions);

        console.log(`Found ${this.currentSuggestions.length} suggestions`);

        if (this.currentSuggestions.length === 0) {
            this.hide();
            return;
        }

        this.renderSuggestions(currentWord);
        this.container.style.display = 'block';
        this.isVisible = true;
        this.positionContainer(editor);
    }

  getMethodSuggestions(objectName, methodPart) {
    console.log(`=== AUTCOMPLETE DEBUG ===`);
    console.log(`Searching methods for: ${objectName}.${methodPart}`);
    console.log(`Object name: "${objectName}", Method part: "${methodPart}"`);

    const suggestions = [];

    // 1. Проверяем встроенные объекты
    const coreProvider = this.providers.find(p => p instanceof CoreArduinoProvider);
    if (coreProvider && coreProvider.isBuiltInObject) {
        if (coreProvider.isBuiltInObject(objectName)) {
            const methods = coreProvider.getMethodSuggestions(objectName, methodPart);
            console.log(`Found ${methods.length} core methods for ${objectName}`);
            suggestions.push(...methods);
        }
    }

    // 2. Проверяем пользовательские переменные
    const userProvider = this.providers.find(p => p instanceof UserCodeProvider);
    if (userProvider) {
        const variableType = userProvider.getVariableType(objectName);
        console.log(`Variable ${objectName} type: ${variableType}`);

        if (variableType) {
            if (variableType === 'String') {
                const stringMethods = coreProvider.getMethodSuggestions('String', methodPart);
                suggestions.push(...stringMethods);
                console.log(`Found ${stringMethods.length} String methods`);
            } else {
                console.log(`Variable ${objectName} is of type: ${variableType}`);

                // Ищем методы в библиотечном провайдере для конкретного типа
                const dynamicProvider = this.providers.find(p => p instanceof EnhancedDynamicLibraryProvider);
                if (dynamicProvider) {
                    const methods = dynamicProvider.getMethodSuggestions(variableType, methodPart);
                    console.log(`Found ${methods.length} library methods for class ${variableType}`);
                    suggestions.push(...methods);
                }
            }
        }
    }

    // 3. Проверяем библиотечные классы напрямую
    const dynamicProvider = this.providers.find(p => p instanceof EnhancedDynamicLibraryProvider);
    if (dynamicProvider && dynamicProvider.isLibraryClass) {
        if (dynamicProvider.isLibraryClass(objectName)) {
            const libraryName = dynamicProvider.getClassLibrary(objectName);
            console.log(`Class ${objectName} belongs to library: ${libraryName}`);

            const methods = dynamicProvider.getMethodSuggestions(objectName, methodPart);
            console.log(`Found ${methods.length} direct library methods for ${objectName}`);
            suggestions.push(...methods);
        }
    }

    console.log(`Total suggestions for ${objectName}.${methodPart}: ${suggestions.length}`);
    console.log(`=== END DEBUG ===`);

    return suggestions;
}

    removeDuplicateSuggestions(suggestions) {
        const seen = new Set();
        return suggestions.filter(suggestion => {
            const key = `${suggestion.matchText}-${suggestion.displayText}-${suggestion.insertText}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    renderSuggestions(currentWord) {
        this.container.innerHTML = '';
        this.selectedIndex = 0;

        this.currentSuggestions.forEach((suggestion, index) => {
            const item = this.createSuggestionItem(suggestion, index, currentWord);
            this.container.appendChild(item);
        });

        this.scrollToSelected();
    }

    createSuggestionItem(suggestion, index, currentWord) {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.dataset.type = suggestion.type;
        item.dataset.index = index;

        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #444;
            background: ${index === 0 ? '#3c3c3c' : '#2b2b2b'};
            color: ${this.getTypeColor(suggestion.type)};
            transition: background-color 0.1s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 20px;
        `;

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: ${this.getTypeColor(suggestion.type)}">${suggestion.displayText}</span>
            </div>
            <span class="autocomplete-type" style="font-size: 0.75em; opacity: 0.7; color: #ccc;">${suggestion.typeLabel}</span>
        `;

        item.addEventListener('mouseenter', () => {
            this.selectIndex(index);
        });

        item.addEventListener('click', () => {
            this.applySuggestion(suggestion, currentWord);
        });

        return item;
    }

        applySuggestion(suggestion, currentWord) {
            const editor = document.getElementById('codeEditor');
            if (!editor) return;

            const cursorPos = editor.selectionStart;
            const value = editor.value;
            const textBeforeCursor = editor.value.substring(0, cursorPos);
            const textAfterCursor = editor.value.substring(cursorPos);

            console.log(`Applying suggestion: ${suggestion.insertText} for word: ${currentWord}`);

            // ОСОБАЯ ОБРАБОТКА ДЛЯ INCLUDE
            if (suggestion.type === 'include') {
                this.applyIncludeSuggestion(editor, suggestion, textBeforeCursor, textAfterCursor, cursorPos);
                return;
            }

            if (currentWord.includes('.')) {
                const parts = currentWord.split('.');
                const objectName = parts[0];
                const methodPart = parts[1] || '';

                // Находим позицию точки
                const dotPos = textBeforeCursor.lastIndexOf('.');
                if (dotPos !== -1) {
                    // Заменяем только часть после точки
                    const newText = textBeforeCursor.substring(0, dotPos + 1) +
                                  suggestion.insertText +
                                  textAfterCursor;

                    editor.value = newText;

                    let newCursorPos = dotPos + 1 + suggestion.insertText.length;
                    if (suggestion.cursorOffset) {
                        newCursorPos += suggestion.cursorOffset;
                    }

                    editor.selectionStart = editor.selectionEnd = newCursorPos;

                    if (window.CodeEditor && window.CodeEditor.highlightCode) {
                        window.CodeEditor.highlightCode(editor.value);
                    }
                    this.hide();
                    editor.focus();
                    return;
                }
            }

            // Для остальных случаев
            const wordStart = textBeforeCursor.search(new RegExp('\\b' + this.escapeRegExp(currentWord) + '\\b$'));
            if (wordStart !== -1) {
                editor.value = textBeforeCursor.substring(0, wordStart) +
                              suggestion.insertText +
                              textAfterCursor;

                let newCursorPos = wordStart + suggestion.insertText.length;
                if (suggestion.cursorOffset) {
                    newCursorPos += suggestion.cursorOffset;
                }

                editor.selectionStart = editor.selectionEnd = newCursorPos;
            } else {
                // Fallback: вставляем в текущую позицию курсора
                editor.value = textBeforeCursor + suggestion.insertText + textAfterCursor;
                let newCursorPos = cursorPos + suggestion.insertText.length;
                if (suggestion.cursorOffset) {
                    newCursorPos += suggestion.cursorOffset;
                }
                editor.selectionStart = editor.selectionEnd = newCursorPos;
            }

            if (window.CodeEditor && window.CodeEditor.highlightCode) {
                window.CodeEditor.highlightCode(editor.value);
            }
            this.hide();
            editor.focus();
        }

        // НОВЫЙ МЕТОД для обработки include подсказок
        applyIncludeSuggestion(editor, suggestion, textBeforeCursor, textAfterCursor, cursorPos) {
            console.log('Applying include suggestion:', suggestion);

            // Ищем начало директивы include
            const includeMatch = textBeforeCursor.match(/(#include\s*[<"][^<">]*)$/);

            if (includeMatch) {
                // Заменяем всю директиву include
                const includeStart = cursorPos - includeMatch[1].length;
                editor.value = textBeforeCursor.substring(0, includeStart) +
                              suggestion.insertText +
                              textAfterCursor;

                editor.selectionStart = editor.selectionEnd = includeStart + suggestion.insertText.length;
            } else {
                // Если не нашли полную директиву, ищем только #include
                const hashIncludeMatch = textBeforeCursor.match(/(#include\s*)$/);
                if (hashIncludeMatch) {
                    const includeStart = cursorPos - hashIncludeMatch[1].length;
                    editor.value = textBeforeCursor.substring(0, includeStart) +
                                  suggestion.insertText +
                                  textAfterCursor;

                    editor.selectionStart = editor.selectionEnd = includeStart + suggestion.insertText.length;
                } else {
                    // Fallback: вставляем в текущую позицию
                    editor.value = textBeforeCursor + suggestion.insertText + textAfterCursor;
                    editor.selectionStart = editor.selectionEnd = cursorPos + suggestion.insertText.length;
                }
            }

            if (window.CodeEditor && window.CodeEditor.highlightCode) {
                window.CodeEditor.highlightCode(editor.value);
            }
            this.hide();
            editor.focus();
        }

    getTypeColor(type) {
        const colors = {
            'function': '#4EC9B0',
            'keyword': '#569CD6',
            'type': '#4FC1FF',
            'constant': '#CE9178',
            'user_function': '#C586C0',
            'user_variable': '#9CDCFE',
            'class_instance': '#9CDCFE',
            'global_object': '#4EC9B0',
            'string_method': '#D7BA7D',
            'serial_method': '#D7BA7D',
            'software_serial_method': '#D7BA7D',
            'servo_method': '#D7BA7D',
            'lcd_method': '#D7BA7D',
            'library_method': '#D7BA7D',
            'library_class': '#569CD6',
            'macro': '#C586C0',
            'ssd1306_method': '#D7BA7D',
            'wire_method': '#D7BA7D',
            'include': '#CE9178',
            'common_variable': '#9CDCFE'
        };
        return colors[type] || '#CCCCCC';
    }

    positionContainer(editor) {
        if (!editor) return;

        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines[lines.length - 1] || '';

        const editorRect = editor.getBoundingClientRect();
        const style = window.getComputedStyle(editor);

        const charWidth = 8.5;
        const lineHeight = parseInt(style.lineHeight) || 20;

        const cursorX = currentLine.length * charWidth - editor.scrollLeft;
        const cursorY = (lines.length - 1) * lineHeight - editor.scrollTop;

        let left = editorRect.left + cursorX + parseInt(style.paddingLeft);
        let top = editorRect.top + cursorY + parseInt(style.paddingTop) + lineHeight;

        this.container.style.display = 'block';
        const containerRect = this.container.getBoundingClientRect();
        const containerWidth = containerRect.width || 280;
        const containerHeight = containerRect.height || 300;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (left + containerWidth > windowWidth) {
            left = Math.max(10, windowWidth - containerWidth - 10);
        }

        if (top + containerHeight > windowHeight) {
            const aboveCursor = top - containerHeight - lineHeight;
            if (aboveCursor >= 10) {
                top = aboveCursor;
            } else {
                top = windowHeight - containerHeight - 10;
            }
        }

        if (left < 10) left = 10;
        if (top < 10) top = 10;

        this.container.style.left = left + 'px';
        this.container.style.top = top + 'px';
    }

    selectNext() {
        if (this.currentSuggestions.length === 0) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.currentSuggestions.length;
        this.updateSelection();
        this.scrollToSelected();
    }

    selectPrevious() {
        if (this.currentSuggestions.length === 0) return;
        this.selectedIndex = this.selectedIndex > 0
            ? this.selectedIndex - 1
            : this.currentSuggestions.length - 1;
        this.updateSelection();
        this.scrollToSelected();
    }

    selectIndex(index) {
        if (index >= 0 && index < this.currentSuggestions.length) {
            this.selectedIndex = index;
            this.updateSelection();
        }
    }

    updateSelection() {
        const items = this.container.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.style.background = '#3c3c3c';
                item.style.color = '#FFFFFF';
            } else {
                item.style.background = '#2b2b2b';
                item.style.color = this.getTypeColor(item.dataset.type);
            }
        });
    }

    scrollToSelected() {
        const items = this.container.querySelectorAll('.autocomplete-item');
        if (items[this.selectedIndex]) {
            items[this.selectedIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    applySelected() {
        if (!this.isVisible || this.currentSuggestions.length === 0) return;

        if (this.selectedIndex >= this.currentSuggestions.length) {
            this.selectedIndex = this.currentSuggestions.length - 1;
        }

        if (this.selectedIndex < 0) {
            this.selectedIndex = 0;
        }

        const suggestion = this.currentSuggestions[this.selectedIndex];
        const currentWord = this.getCurrentWord();
        this.applySuggestion(suggestion, currentWord);
    }

    getCurrentWord() {
        const editor = document.getElementById('codeEditor');
        if (!editor) return '';

        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);

        const matches = textBeforeCursor.match(/([\w.]+\.\w*|\w*)$/);
        return matches ? matches[0] : '';
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
        this.currentSuggestions = [];
        this.selectedIndex = 0;
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'autocomplete-container';
        container.style.cssText = `
            position: fixed;
            background: #2b2b2b;
            border: 1px solid #444;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-height: 300px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            min-width: 280px;
            font-family: 'Consolas', monospace;
            font-size: 14px;
        `;
        return container;
    }
}

if (typeof window.AutocompleteManager === 'undefined') {
    window.AutocompleteManager = AutocompleteManager;
}